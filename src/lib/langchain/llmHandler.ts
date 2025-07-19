import type { ChatContext, Message } from "@/types/types";
import { v4 as uuidv4 } from "uuid";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
	HumanMessage,
	AIMessage,
	type AIMessageChunk,
	type BaseMessageLike,
	type BaseMessage,
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
import { ConversationSummaryMemory } from "langchain/memory";
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
} from "@langchain/core/prompts";
import { LRUCache } from "lru-cache";
import { toolNode, tools } from "./tools";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const TOKEN_LIMIT = 8192; // 8k tokens
const SUMMARY_SIZE = 256;
const RECENT_MESSAGES = 3; // 3 turns of messages

// ${userId}-${chatId}
// max 100 chats lasting for 1 hour
const chatCache = new LRUCache<string, ChatContext>({
	max: 100,
	ttl: 1000 * 60 * 60 * 2,
	allowStale: false,
});

// ${userId}-${chatId}
const summaryCache = new LRUCache<string, string>({
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

// Create conversation summary memory
const createSummaryMemory = (llmProvider: BaseChatModel) => {
	return new ConversationSummaryMemory({
		llm: llmProvider,
		returnMessages: true,
	});
};

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
			console.log("formatted prompt: ", formattedPrompt);
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

// Create prompt template with summary and recent messages
const createChatPrompt = () => {
	return ChatPromptTemplate.fromMessages([
		[
			"system",
			"You are a helpful AI assistant. Here's a summary of our previous conversation:\n\n{summary}",
		],
		new MessagesPlaceholder("recent_messages"),
		["human", "{input}"],
	]);
};

const prepareMessagesWithSummary = async (
	messages: BaseMessage[],
	summaryMemory: ConversationSummaryMemory,
	currentInput: string,
): Promise<{ summary: string; recent_messages: BaseMessage[] }> => {
	if (messages.length <= RECENT_MESSAGES * 2) {
		return {
			summary: "No previous conversation to summarize.",
			recent_messages: messages,
		};
	}

	const messagesToSummarize = messages.slice(0, -(RECENT_MESSAGES * 2));
	const recentMessages = messages.slice(-(RECENT_MESSAGES * 2));

	let summary = "";
	if (messagesToSummarize.length > 0) {
		for (const message of messagesToSummarize) {
			await summaryMemory.saveContext(
				{ input: message.content },
				{ output: "" },
			);
		}
		const memoryVariables = await summaryMemory.loadMemoryVariables({});
		summary =
			memoryVariables.history || "No previous conversation to summarize.";
	}

	return { summary, recent_messages: recentMessages };
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

		// Initialize summary memory for new chat context
		chatContext.summaryMemory = createSummaryMemory(chatProvider);
	} else {
		console.log("Using cached chat context for", chatKey);
	}

	// Add current question to messages
	chatContext.messages.push(new HumanMessage(content));

	// enclose this in a try catch later
	if (!chatContext.summaryMemory)
		throw new Error("summary memory not initialized");

	const { summary, recent_messages } = await prepareMessagesWithSummary(
		chatContext.messages,
		chatContext.summaryMemory,
		content,
	);

	// changes messages to be first part summary. 2nd part last 3 message turns verbatim if enough tokens. then prompt inside a prompt template.
	const stream = await agent.stream(
		{
			messages: [], // Empty - we use summary/recent_messages instead
			summary,
			recent_messages,
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

				chatContext.messages.push(new AIMessage(aiMessage.content));
				await chatContext.summaryMemory.saveContext(
					{ input: content },
					{ output: aiMessage.content },
				);
				chatCache.set(chatKey, chatContext);

				console.log("AI message:", aiMessage);

				insertMessage([humanMessageWithTokens, aiMessage]);
			}
		}
	} catch (error) {
		console.error("Error fetching metadata:", error);
	}
};

export { askQuestion };
