// goals. chat peristance. store last x messages up to token limit. also store system prompt that summarizes rest of chat. As chat continues. Storre last message until limit. then summarize all messages again.

import type { Message } from "@/types/types";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import {
	HumanMessage,
	AIMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { getMessages } from "../helper";
import { messages } from "@/db/schema";

const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content } = message;
	const config = { configurable: { thread_id: chatId } };

	// get messages from database
	const messageHistory = await getMessages(userId, chatId);

	// map to BaseMessageLike
	const context = messageHistory.map((msg) => {
		if (msg.role === "human") {
			return new HumanMessage(msg.content);
		}
		if (msg.role === "ai") {
			return new AIMessage(msg.content);
		}
		return new SystemMessage(msg.content);
	});

	// add question
	context.push(new HumanMessage(content));

	// const output = await app.invoke({ messages: content }, config);

	const stream = await chatProvider.stream(context, config);
	const chunks = [];
	for await (const chunk of stream) {
		chunks.push(chunk);

		yield chunk;
	}
};

export { askQuestion };
