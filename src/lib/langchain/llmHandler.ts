import type { ChatContext, Message, MessageHistory } from "@/lib/types";
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
	type BaseMessage,
	SystemMessage,
	isAIMessageChunk,
} from "@langchain/core/messages";
import {
	convertToBaseMessageArray,
	getChatContext,
	getMessages,
	getRecentMessages,
	insertMessage,
	updateSummary,
} from "../helper";
import {
	StateGraph,
	START,
	END,
	Annotation,
	MemorySaver,
} from "@langchain/langgraph";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { LRUCache } from "lru-cache";
import { toolNode, tools } from "./tools";
import { updateSummaryPrompt, createChatPrompt } from "./prompts";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const TOKEN_LIMIT = 8192; // 8k tokens
const SUMMARY_SIZE = 256;
const MAX_MESSAGE_TURNS = 6; // 12 messages. any more and should summarize again.
// ${userId}-${chatId}
// max 100 chats lasting for 1 hour
const chatCache = new LRUCache<string, ChatContext>({
	max: 100,
	ttl: 1000 * 60 * 60 * 2,
	allowStale: false,
});

// define state for langgraph
const StateAnnotation = Annotation.Root({
	messages: Annotation<BaseMessageLike[]>({
		reducer: (x, y) => x.concat(y),
	}),
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
	}),
	recent_messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => y ?? x,
	}),
	input: Annotation<string>({
		reducer: (x, y) => y ?? x,
	}),
});

// message router. if tool call, call tool node else END
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
	prompt: ChatPromptTemplate,
) => {
	return async (state: typeof StateAnnotation.State) => {
		const { messages, summary, recent_messages, input } = state;

		if (
			summary !== undefined &&
			recent_messages !== undefined &&
			input !== undefined
		) {
			const formattedPrompt = await prompt.formatMessages({
				summary,
				recent_messages,
				input,
			});
			// console.log(formattedPrompt);
			const responseMessage = await llmProvider.invoke(formattedPrompt);
			return { messages: [responseMessage] };
		}

		// fallback if no summary / recent_messages
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
	const prompt = createChatPrompt();

	// orchestration
	const workflow = new StateGraph(StateAnnotation)
		.addNode("agent", handleCallModel(llmProvider, prompt))
		.addNode("tools", toolNode)
		.addEdge(START, "agent")
		.addConditionalEdges("agent", routeMessage)
		.addEdge("tools", "agent");

	const agent = workflow.compile({ checkpointer });

	return { agent };
};

const summarizeMessages = async (
	existing_summary: string,
	lastSummaryIndex: number,
	lastMessageIndex: number,
	userId: string,
	chatId: string,
	chatProvider: BaseChatModel,
): Promise<{ summary: string; lastSummaryIndex: number }> => {
	const summaryUpdatePrompt = updateSummaryPrompt();
	const new_messages = await getRecentMessages(
		userId,
		chatId,
		lastSummaryIndex,
		lastMessageIndex,
	);

	const formattedSummaryPrompt = await summaryUpdatePrompt.formatMessages({
		existing_summary,
		new_messages,
	});

	const reply = await chatProvider.invoke(formattedSummaryPrompt);
	updateSummary(userId, chatId, reply.content as string, lastMessageIndex);
	return {
		summary: reply.content as string,
		lastSummaryIndex: lastMessageIndex - 1,
	};
};

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
	summaryProvider: BaseChatModel,
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
		// { messages: context, totalTokens: contextTokens, summary: summary, lastSummaryIndex: lastIndex }
		chatContext = await getChatContext(message);

		console.log(chatContext);
	} else {
		console.log("Using cached chat context for", chatKey);
	}

	const calculateApproxTokens = (content: string): number => {
		const overhead = 12;
		return content.length / 4 + overhead;
	};

	// changes messages to be first part summary. 2nd part last 3 message turns verbatim if enough tokens. then prompt inside a prompt template.
	const stream = await agent.stream(
		{
			messages: [], // Empty, keep here for compatibility
			summary: chatContext.summary,
			recent_messages: convertToBaseMessageArray(
				chatContext.messages as MessageHistory[],
			),
			input: content,
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

			if (lastMessage.response_metadata) {
				// calculate how many tokens in the prompt.

				const promptTokens =
					chatContext.messages.length === 1
						? lastMessage.response_metadata.usage.total_tokens -
							lastMessage.response_metadata.usage.completion_tokens
						: lastMessage.response_metadata.usage.total_tokens -
							chatContext.approximateTotalTokens -
							lastMessage.response_metadata.usage.completion_tokens;

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
					messageOrder:
						message.messageOrder !== undefined ? message.messageOrder + 1 : -1,
				};

				chatContext.messages.push(humanMessageWithTokens);
				chatContext.messages.push(aiMessage);
				chatContext.approximateTotalTokens +=
					calculateApproxTokens(humanMessageWithTokens.content) +
					calculateApproxTokens(aiMessage.content);

				// insert messages
				insertMessage([humanMessageWithTokens, aiMessage]);

				if (
					chatContext.approximateTotalTokens > 4096 ||
					chatContext.messages.length > 8
				) {
					// needs summation + message trim
				}

				// figure out if I should remove messages / summarize
				if (chatContext.messages.length > 6) {
					chatContext.messages.shift();
					chatContext.messages.shift();
				}

				chatCache.set(chatKey, chatContext);
			}
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
	}
};

export { askQuestion };
