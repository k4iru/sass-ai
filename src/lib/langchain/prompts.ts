import {
	ChatPromptTemplate,
	MessagesPlaceholder,
} from "@langchain/core/prompts";

export const updateSummaryPrompt = () => {
	return ChatPromptTemplate.fromMessages([
		[
			"system",
			`You are a helpful assistant that updates chat summaries to help AI agents recall only the most relevant context.

Update the summary by incorporating the new messages. Focus on:
- User's goals, questions, preferences, constraints, and decisions.
- Assistant responses that affect next steps.
- Tool use, observations, or intermediate results.
- Leave out greetings, filler, and chit-chat.

Maintain a factual, concise summary useful for downstream agents. keep the summary under 300 characters

EXISTING SUMMARY:
{existing_summary}

NEW MESSAGES:
{new_messages}

UPDATED SUMMARY:`,
		],
	]);
};

export const createChatPrompt = () => {
	return ChatPromptTemplate.fromMessages([
		[
			"system",
			"You are a helpful AI assistant. Keep responses under 12,000 characters. Format output using markdown. Here's a summary of our previous conversation:\n\n{summary}",
		],
		new MessagesPlaceholder("recent_messages"),
		["human", "{input}"],
	]);
};
