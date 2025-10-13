import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
	type AIMessageChunk,
	isAIMessageChunk,
} from "@langchain/core/messages";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Runnable } from "@langchain/core/runnables";
import { MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import type { AgentDeps } from "@/lib/container";
import { routeMessage, StateAnnotation } from "@/lib/langchain/llmHelper";
import type {
	ChatContext,
	ChatContextManager,
	Message,
	MessageHistory,
} from "@/lib/types";
import { convertToBaseMessageArray } from "../helper";
import { logger } from "../logger";
import { getOrCreateChatContext } from "./getOrCreateChatContext";
import { createChatPrompt } from "./prompts";
import { toolNode, tools } from "./tools";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const MAX_MESSAGE_TURNS = 6; // 12 messages. any more and should summarize again.

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

const bindToolsToChatProvider = (
	chatProvider: BaseChatModel,
): Runnable<
	BaseLanguageModelInput,
	AIMessageChunk,
	BaseChatModelCallOptions
> | null => {
	// bind the provider to available tools

	try {
		const boundChatProvider =
			typeof chatProvider.bindTools === "function"
				? chatProvider.bindTools(tools)
				: null;

		return boundChatProvider;
	} catch (error) {
		logger.error("Error binding tools to chat provider:", error);
		return null;
	}
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

const updateChatContext = (
	context: ChatContext,
	contextManager: ChatContextManager,
	humanMessage: Message,
	aiMessage: Message,
	summaryProvider: BaseChatModel,
	calculateApproxTokens: (text: string) => number,
): void => {
	context.messages.push(humanMessage);
	context.messages.push(aiMessage);

	context.approximateTotalTokens +=
		calculateApproxTokens(humanMessage.content) +
		calculateApproxTokens(aiMessage.content);

	if (
		context.approximateTotalTokens > 4096 ||
		context.messages.length > MAX_MESSAGE_TURNS
	) {
		contextManager.updateSummaryInBackground(
			humanMessage.userId,
			humanMessage.chatId,
			summaryProvider,
		);
	}

	contextManager.setChatContext(
		humanMessage.userId,
		humanMessage.chatId,
		context,
	);
};

const updateDatabase = async (
	humanMessage: Message,
	aiMessage: Message,
	exactTokenUsage: number,
	insertMessage: (msgs: Message[]) => Promise<boolean>,
	updateTokenUsage: (
		userId: string,
		chatId: string,
		token: number,
	) => Promise<void>,
): Promise<void> => {
	// insert messages
	insertMessage([humanMessage, aiMessage]);

	// update exact token usage for billing purposes
	updateTokenUsage(humanMessage.userId, humanMessage.chatId, exactTokenUsage);
};

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
	summaryProvider: BaseChatModel,
	askQuestionDeps: AgentDeps,
): AsyncGenerator<AIMessageChunk> {
	const { chatId, content } = message;
	const {
		chatContextManager,
		insertMessage,
		updateTokenUsage,
		createChatContext,
		calculateApproxTokens,
	} = askQuestionDeps;

	const chatContext = await getOrCreateChatContext(message, {
		manager: chatContextManager,
		createChatContext,
	});

	/* no bound tools for now. wait until updating with search feature
	const boundChatProvider = bindToolsToChatProvider(chatProvider);
	if (boundChatProvider == null) {
		throw new Error("Failed to bind tools to chat provider.");
	} */

	const { agent } = handleWorkFlow(chatProvider);

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

	// get final state for approximating and updating context and also updating db. split this into more parts

	// still need to getState for exact token usage from provider, since openai doesn't provide it while streaming.

	try {
		const finalState = await agent.getState({
			configurable: { thread_id: chatId },
		});

		const lastMessage =
			finalState.values.messages[finalState.values.messages.length - 1];
		const exactTokenUsage = lastMessage.response_metadata?.usage?.total_tokens;
		const approxPromptTokens = calculateApproxTokens(message.content);

		const humanMessageWithTokens = {
			...message,
			tokens: approxPromptTokens,
		};

		const aiMessage: Message = {
			id: uuidv4(),
			role: "ai",
			chatId: message.chatId,
			userId: message.userId,
			content: lastMessage.content,
			provider: message.provider || "",
			createdAt: new Date(),
			tokens: calculateApproxTokens(lastMessage.content),
			messageOrder: message.messageOrder + 1,
		};

		await updateDatabase(
			humanMessageWithTokens,
			aiMessage,
			exactTokenUsage || 0,
			insertMessage,
			updateTokenUsage,
		);

		updateChatContext(
			chatContext,
			chatContextManager,
			humanMessageWithTokens,
			aiMessage,
			summaryProvider,
			calculateApproxTokens,
		);
	} catch (error) {
		logger.error("Error in post-stream processing:", error);
	}
};

export { askQuestion };
