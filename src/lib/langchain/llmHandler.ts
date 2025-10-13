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
import type { Message, MessageHistory } from "@/lib/types";
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

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
	summaryProvider: BaseChatModel,
	askQuestionDeps: AgentDeps,
): AsyncGenerator<AIMessageChunk> {
	const { chatId, userId, content, provider } = message;
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
	try {
		const finalState = await agent.getState({
			configurable: { thread_id: chatId },
		});

		if (finalState.values?.messages) {
			const lastMessage =
				finalState.values.messages[finalState.values.messages.length - 1];

			if (lastMessage.response_metadata) {
				// calculate how many tokens in the prompt.

				const promptTokens = calculateApproxTokens(message.content);

				const humanMessageWithTokens = {
					...message,
					tokens: promptTokens,
				};

				const aiResponse = chunks.map((c) => c.content).join("");

				const aiMessage: Message = {
					id: uuidv4(),
					role: "ai",
					chatId: chatId,
					userId: userId,
					content: aiResponse,
					provider: provider || "",
					createdAt: new Date(),
					tokens: calculateApproxTokens(aiResponse),
					messageOrder: message.messageOrder + 1,
				};

				chatContext.messages.push(humanMessageWithTokens);
				chatContext.messages.push(aiMessage);

				chatContext.approximateTotalTokens +=
					calculateApproxTokens(humanMessageWithTokens.content) +
					calculateApproxTokens(aiMessage.content);

				// insert messages
				insertMessage([humanMessageWithTokens, aiMessage]);
				updateTokenUsage(
					userId,
					chatId,
					lastMessage.response_metadata.usage.total_tokens,
				);

				// re summarize
				if (
					chatContext.approximateTotalTokens > 4096 ||
					chatContext.messages.length > MAX_MESSAGE_TURNS
				) {
					chatContextManager.updateSummaryInBackground(
						userId,
						chatId,
						summaryProvider,
					);
				}

				// update context
				chatContextManager.setChatContext(userId, chatId, chatContext);
			}
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
	}
};

export { askQuestion };
