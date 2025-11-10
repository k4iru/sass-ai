import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
	type AIMessageChunk,
	isAIMessageChunk,
} from "@langchain/core/messages";
import type { Runnable } from "@langchain/core/runnables";
import { v4 as uuidv4 } from "uuid";
import type { AgentDeps } from "@/lib/container";
import type { Message, MessageHistory } from "@/lib/types";
import { convertToBaseMessageArray } from "../helper";
import { logger } from "../logger";
import { getOrCreateChatContext } from "./getOrCreateChatContext";
import { handleWorkFlow } from "./llmHelper";
import { tools } from "./tools";

// not currently binding tools. future TODO when more are added
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
		updateChatContext,
		updateDatabase,
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

		updateChatContext(
			chatContext,
			chatContextManager,
			humanMessageWithTokens,
			aiMessage,
			summaryProvider,
			calculateApproxTokens,
		);

		await updateDatabase(
			humanMessageWithTokens,
			aiMessage,
			exactTokenUsage || 0,
			insertMessage,
			updateTokenUsage,
		);

		// TODO implement blocker to prevent user from immediately sending another message until db is updated
	} catch (error) {
		logger.error("Error in post-stream processing:", error);
	}
};

export { askQuestion };
