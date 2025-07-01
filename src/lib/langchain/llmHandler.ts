// goals. chat peristance. store last x messages up to token limit. also store system prompt that summarizes rest of chat. As chat continues. Storre last message until limit. then summarize all messages again.

import type { Message } from "@/types/types";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessageChunk } from "@langchain/core/messages";
import {
	START,
	END,
	MessagesAnnotation,
	StateGraph,
	MemorySaver,
} from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

const createCallModel = (model: BaseChatModel) => {
	return async (state: typeof MessagesAnnotation.State) => {
		const stream = await model.stream(state.messages);
		return { stream };
	};
};

const createWorkflow = (model: BaseChatModel) => {
	const workflow = new StateGraph(MessagesAnnotation)
		.addNode("model", createCallModel(model))
		.addEdge(START, "model")
		.addEdge("model", END);

	const memory = new MemorySaver();
	const app = workflow.compile({ checkpointer: memory });

	return { app, memory };
};

const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content } = message;
	const config = { configurable: { thread_id: chatId } };

	const { app } = createWorkflow(chatProvider);

	// const output = await app.invoke({ messages: content }, config);

	const { stream } = await app.invoke(content);
	const chunks = [];
	for await (const chunk of stream) {
		chunks.push(chunk);

		yield chunk;
	}
};

export { askQuestion };
