import type { Message } from "@/types/types";
import { Annotation } from "@langchain/langgraph";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import type {
	AIMessageChunk,
	BaseMessageLike,
	BaseMessage,
} from "@langchain/core/messages";
import {
	HumanMessage,
	AIMessage,
	SystemMessage,
	isAIMessageChunk,
} from "@langchain/core/messages";
import { getMessages, insertMessage } from "../helper";
import { StateGraph, END } from "@langchain/langgraph";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { LRUCache } from "lru-cache";
import { get_encoding, type TiktokenEncoding } from "@dqbd/tiktoken";
import { MemorySaver } from "@langchain/langgraph";
import { toolNode, tools } from "./tools";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const TOKEN_LIMIT = 8192; // 8k tokens

const chatCache = new LRUCache<string, BaseMessageLike[]>({
	max: 100,
	ttl: 1000 * 60 * 60,
	allowStale: false,
});

const StateAnnotation = Annotation.Root({
	messages: Annotation<BaseMessageLike[]>({
		reducer: (x, y) => x.concat(y),
	}),
});

const routeMessage = (state: typeof StateAnnotation.State) => {
	const { messages } = state;
	const lastMessage = messages[messages.length - 1] as AIMessage;
	// If no tools are called, we can finish (respond to the user)
	if (!lastMessage?.tool_calls?.length) {
		return END;
	}
	// Otherwise if there is, we continue and call the tools
	return "tools";
};
const handleCallModel = (
	llmProvider: Runnable<
		BaseLanguageModelInput,
		AIMessageChunk,
		BaseChatModelCallOptions
	>,
) => {
	return async (state: typeof StateAnnotation.State) => {
		// For versions of @langchain/core < 0.2.3, you must call `.stream()`
		// and aggregate the message from chunks instead of calling `.invoke()`.
		const { messages } = state;
		const responseMessage = await llmProvider.invoke(messages);
		return { messages: [responseMessage] };
	};
};
const handleWorkFlow = (
	llmProvider: Runnable<
		BaseLanguageModelInput,
		AIMessageChunk,
		BaseChatModelCallOptions
	>,
) => {
	const checkpointer = new MemorySaver();

	const workflow = new StateGraph(StateAnnotation)
		.addNode("agent", handleCallModel(llmProvider))
		.addNode("tools", toolNode)
		.addEdge("__start__", "agent")
		.addConditionalEdges("agent", routeMessage)
		.addEdge("tools", "agent");

	const agent = workflow.compile({ checkpointer });

	return { agent };
};

// create a function to approximate numbers of tokens. useful for send limits.
const approximateTokens = (
	context: Message[],
	encodingName = "cl100k_base",
) => {
	const enc = get_encoding(encodingName as TiktokenEncoding);
	let tokenCount = 0;
	for (const message of context) {
		const tokens = enc.encode(message.content as string);
		tokenCount += 4;
		tokenCount += tokens.length;
		tokenCount += message.role.length;
		tokenCount += 2;
	}

	return tokenCount;
};

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content, provider } = message;

	const boundChatProvider =
		typeof chatProvider.bindTools === "function"
			? chatProvider.bindTools(tools)
			: null;

	if (!boundChatProvider) {
		throw new Error("Chat provider does not support binding tools.");
	}

	const { agent } = handleWorkFlow(boundChatProvider);

	// get messages from database. potentially change this to be more efficient.
	// get messages up to token limit

	// returns list of Message objects
	const messageHistory = await getMessages(userId, chatId);

	const chatKey = `${userId}-${chatId}`;
	const chatContext = chatCache.get(chatKey);
	let tokenCount = -1;

	if (!chatContext) {
		// fetch from database.
		// fetch messages up to token limit than summarize it.
		// if first message approximate first message. else try and grab context from db.
		if (messageHistory.length === 0) {
			tokenCount = approximateTokens([message]);
		} else {
			tokenCount = approximateTokens(messageHistory);
		}
	}

	console.log(tokenCount);

	if (chatCache.has(chatKey)) {
		console.log("Using cached chat context for", chatKey);
	}
	// schema for context.
	// have a system message at the start with instructions plus summary of chat if too many messages / tokens used. System message + summary should be less than 250 tokens.
	// can fill rest of token limit with last x messages. as new messages are added. remove the oldest messages and resummarize chat.
	// if chatCache has the chatId, use that instead of fetching from database.

	// convery Message[] to a format that langchain understands
	const context = messageHistory.map((msg) => {
		if (msg.role === "human") {
			return new HumanMessage(msg.content);
		}
		if (msg.role === "ai") {
			return new AIMessage(msg.content);
		}
		return new SystemMessage(msg.content);
	});

	// add question
	context.push(new HumanMessage(content));

	// const output = await app.invoke({ messages: content }, config);

	//const stream = await chatProvider.stream(context, config);
	const stream = await agent.stream(
		{
			messages: context,
		},
		{
			streamMode: "messages",
			configurable: {
				thread_id: chatId,
				stream_options: {
					include_usage: true,
				},
			},
		},
	);
	const chunks = [];
	//let finalMetaData = null;

	for await (const [chunk, _metadata] of stream) {
		if (isAIMessageChunk(chunk as AIMessageChunk) && chunk.content.length > 0) {
			chunks.push(chunk);
			yield chunk as AIMessageChunk;
		}
	}

	// if stream is done try and get metadata
	console.log("Stream done, fetching metadata...");
	try {
		const finalState = await agent.getState({
			configurable: { thread_id: chatId },
		});

		if (finalState.values?.messages) {
			const lastMessage =
				finalState.values.messages[finalState.values.messages.length - 1];
			console.log("Last message:", lastMessage);

			if (lastMessage.reponse_metadata) {
				console.log("Response metadata:", lastMessage.reponse_metadata);
				const previousTotalTokens =
					messageHistory.length > 0 ? approximateTokens(messageHistory) : 0;

				const currentInputTokens =
					lastMessage.usage_metadata.input_tokens - previousTotalTokens;

				console.log("Current input tokens:", currentInputTokens);
				console.log("previousTotalTokens:", previousTotalTokens);
			}
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
	}
};

export { askQuestion };
