// goals. chat peristance. store last x messages up to token limit. also store system prompt that summarizes rest of chat. As chat continues. Storre last message until limit. then summarize all messages again.

import type { Message } from "@/types/types";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessageChunk } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";

const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content } = message;
	const config = { configurable: { thread_id: chatId } };

	// const output = await app.invoke({ messages: content }, config);

	const stream = await chatProvider.stream([new HumanMessage(content)], config);
	const chunks = [];
	for await (const chunk of stream) {
		chunks.push(chunk);

		yield chunk;
	}
};

export { askQuestion };
