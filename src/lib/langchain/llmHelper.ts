import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
	AIMessage,
	BaseMessage,
	BaseMessageLike,
} from "@langchain/core/messages";
import { Annotation, END } from "@langchain/langgraph";
import { updateSummary } from "@/lib/helper";
import { updateSummaryPrompt } from "@/lib/langchain/prompts";
import type { ChatContext } from "@/lib/types";

// define state for langgraph
export const StateAnnotation = Annotation.Root({
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
	console.log(formattedSummaryPrompt);

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
