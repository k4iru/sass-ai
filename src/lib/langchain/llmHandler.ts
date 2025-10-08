import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
	type AIMessage,
	type AIMessageChunk,
	type BaseMessage,
	type BaseMessageLike,
	isAIMessageChunk,
} from "@langchain/core/messages";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Runnable } from "@langchain/core/runnables";
import {
	Annotation,
	END,
	MemorySaver,
	START,
	StateGraph,
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import type { Message, MessageHistory } from "@/lib/types";
import {
	convertToBaseMessageArray,
	createChatContext,
	insertMessage,
	updateTokenUsage,
} from "../helper";
import { chatContextManager } from "../services/chatContextManager";
import { calculateApproxTokens } from "./llmHelper";
import { createChatPrompt } from "./prompts";
import { toolNode, tools } from "./tools";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const MAX_MESSAGE_TURNS = 6; // 12 messages. any more and should summarize again.

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
// TODO create more tools
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

	let chatContext = chatContextManager.getChatContext(userId, chatId);

	if (!chatContext) {
		// { messages: context, totalTokens: contextTokens, summary: summary, lastSummaryIndex: lastIndex }
		chatContext = await createChatContext(message);
		chatContextManager.setChatContext(userId, chatId, chatContext);
	} else {
		console.log(`Using cached chat context for ${userId}-${chatId}`);

		if (chatContext.messages.length > 0 && chatContext.lastSummaryIndex > 0) {
			while (
				chatContext.messages.length > 0 &&
				chatContext.messages[0].messageOrder <= chatContext.lastSummaryIndex
			)
				chatContext.messages.shift();
		}

		chatContextManager.setChatContext(userId, chatId, chatContext);
	}

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
