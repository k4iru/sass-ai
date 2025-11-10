import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import type { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Runnable } from "@langchain/core/runnables";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { updateSummary } from "@/lib/helper";
import { createChatPrompt, updateSummaryPrompt } from "@/lib/langchain/prompts";
import type {
	ChatContext,
	ChatContextManager,
	CompiledAgent,
	Message,
} from "@/lib/types";
import { StateAnnotation } from "@/lib/types";
import { toolNode } from "./tools";

const MAX_MESSAGE_TURNS = 6; // 12 messages. any more and should summarize again.

export const updateChatContext = (
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

export const handleWorkFlow = (
	llmProvider: Runnable<
		BaseLanguageModelInput,
		AIMessageChunk,
		BaseChatModelCallOptions
	>,
): { agent: CompiledAgent } => {
	const checkpointer = new MemorySaver();
	const prompt = createChatPrompt();

	const workflow = new StateGraph(StateAnnotation)
		.addNode("agent", handleCallModel(llmProvider, prompt))
		.addNode("tools", toolNode)
		.addEdge(START, "agent")
		.addConditionalEdges("agent", routeMessage)
		.addEdge("tools", "agent");

	const agent = workflow.compile({ checkpointer });

	return { agent };
};

export const handleCallModel = (
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

export const updateDatabase = async (
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

export const routeMessage = (state: typeof StateAnnotation.State) => {
	const { messages } = state;
	const lastMessage = messages[messages.length - 1] as AIMessage;

	// If no tools are called, we can finish (respond to the user)
	if (!lastMessage?.tool_calls?.length) {
		return END;
	}
	// Otherwise if there is, we continue and call the tools
	return "tools";
};

export const calculateApproxTokens = (content: string): number => {
	const overhead = 12;
	return Math.ceil(content.length / 4 + overhead);
};

export const summarizeMessages = async (
	chatContext: ChatContext,
	summaryProvider: BaseChatModel,
): Promise<{ summary: string; lastSummaryIndex: number }> => {
	const summaryUpdatePrompt = updateSummaryPrompt();

	const messagesToSummarize = [];
	let totalTokensLeft = chatContext.approximateTotalTokens;
	let lastSummarizedIndex = -1;
	let i = 0;

	// if tokens used in input are above 4096 then we want to add messages to be summarized and then remove them to free up context space
	while (
		i + 1 < chatContext.messages.length &&
		(totalTokensLeft > 4096 || i < chatContext.messages.length - 4)
	) {
		const humanMessage = chatContext.messages[i];
		const aiMessage = chatContext.messages[i + 1];

		messagesToSummarize.push(humanMessage);
		totalTokensLeft -= humanMessage.tokens || 0;

		messagesToSummarize.push(aiMessage);
		totalTokensLeft -= aiMessage.tokens || 0;

		lastSummarizedIndex = i + 1;
		i += 2;
	}

	const new_messages = messagesToSummarize
		.map((msg) => `${msg.role}: ${msg.content}`)
		.join("\n");

	const formattedSummaryPrompt = await summaryUpdatePrompt.formatMessages({
		existing_summary:
			chatContext.lastSummaryIndex === 0 ? "" : chatContext.summary,
		new_messages: new_messages,
	});

	const reply = await summaryProvider.invoke(formattedSummaryPrompt);
	updateSummary(
		chatContext.userId,
		chatContext.chatId,
		reply.content as string,
		lastSummarizedIndex,
	);
	return {
		summary: reply.content as string,
		// messageOrder starts at 1
		lastSummaryIndex: lastSummarizedIndex,
	};
};
