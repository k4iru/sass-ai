import type { Message } from "@/types/types";
import { v4 as uuidv4 } from "uuid";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
	HumanMessage,
	type AIMessage,
	type AIMessageChunk,
	type BaseMessageLike,
	SystemMessage,
	isAIMessageChunk,
} from "@langchain/core/messages";
import { getChatContext, getMessages, insertMessage } from "../helper";
import {
	StateGraph,
	START,
	END,
	Annotation,
	MemorySaver,
} from "@langchain/langgraph";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { LRUCache } from "lru-cache";
import { toolNode, tools } from "./tools";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const TOKEN_LIMIT = 8192; // 8k tokens
const SUMMARY_SIZE = 256;

// max 100 chats lasting for 1 hour
const chatCache = new LRUCache<
	string,
	{ messages: BaseMessageLike[]; totalTokens: number }
>({
	max: 100,
	ttl: 1000 * 60 * 60,
	allowStale: false,
});

// define state for langgraph
const StateAnnotation = Annotation.Root({
	messages: Annotation<BaseMessageLike[]>({
		reducer: (x, y) => x.concat(y),
	}),
});

// message router. if tool call call tool node else END
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

// agent node
const handleCallModel = (
	llmProvider: Runnable<
		BaseLanguageModelInput,
		AIMessageChunk,
		BaseChatModelCallOptions
	>,
) => {
	return async (state: typeof StateAnnotation.State) => {
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

	// orchestration
	const workflow = new StateGraph(StateAnnotation)
		.addNode("agent", handleCallModel(llmProvider))
		.addNode("tools", toolNode)
		.addEdge(START, "agent")
		.addConditionalEdges("agent", routeMessage)
		.addEdge("tools", "agent");

	const agent = workflow.compile({ checkpointer });

	return { agent };
};

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content, provider } = message;

	// bind the provider to available tools
	const boundChatProvider =
		typeof chatProvider.bindTools === "function"
			? chatProvider.bindTools(tools)
			: null;

	if (!boundChatProvider) {
		throw new Error("Chat provider does not support binding tools.");
	}

	const { agent } = handleWorkFlow(boundChatProvider);

	const chatKey = `${userId}-${chatId}`;
	let chatContext = chatCache.get(chatKey); // cache hit

	if (!chatContext) {
		chatContext = await getChatContext(
			userId,
			chatId,
			TOKEN_LIMIT,
			SUMMARY_SIZE,
		);
	} else {
		console.log("Using cached chat context for", chatKey);
	}

	// add question
	chatContext.messages.push(new HumanMessage(content));

	const stream = await agent.stream(
		{
			messages: chatContext.messages,
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

			if (lastMessage.response_metadata) {
				// calculate how many tokens in the prompt.çç

				const promptTokens =
					chatContext.messages.length === 1
						? lastMessage.response_metadata.usage.total_tokens -
							lastMessage.response_metadata.usage.completion_tokens
						: lastMessage.response_metadata.usage.total_tokens -
							chatContext.totalTokens -
							-lastMessage.response_metadata.usage.completion_tokens;

				console.log("chatcontext: ", chatContext.messages.length);

				console.log("prompt tokens: ", promptTokens);
				const humanMessageWithTokens = {
					...message,
					tokens: promptTokens,
				};

				const aiMessage: Message = {
					id: uuidv4(),
					role: "ai",
					chatId: chatId,
					userId: userId,
					content: chunks.map((c) => c.content).join(""),
					provider: provider || "",
					createdAt: new Date(),
					tokens:
						lastMessage.response_metadata.usage.completion_tokens -
						lastMessage.response_metadata.usage.completion_tokens_details
							.reasoning_tokens,
				};

				console.log("AI message:", aiMessage);

				insertMessage([humanMessageWithTokens, aiMessage]);
			}
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
	}
};

export { askQuestion };
