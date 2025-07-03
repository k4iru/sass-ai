// goals. chat peristance. store last x messages up to token limit. also store system prompt that summarizes rest of chat. As chat continues. Storre last message until limit. then summarize all messages again.

import type { Message } from "@/types/types";
import { Annotation } from "@langchain/langgraph";
import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import type { AIMessageChunk, BaseMessageLike } from "@langchain/core/messages";
import {
	HumanMessage,
	AIMessage,
	SystemMessage,
	isAIMessageChunk,
} from "@langchain/core/messages";
import { getMessages } from "../helper";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { messages } from "@/db/schema";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END } from "@langchain/langgraph";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";

// https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens

const StateAnnotation = Annotation.Root({
	messages: Annotation<BaseMessageLike[]>({
		reducer: (x, y) => x.concat(y),
	}),
});

const searchTool = tool(
	(_) => {
		// This is a placeholder for the actual implementation
		return "Cold, with a low of 3℃";
	},
	{
		name: "search",
		description:
			"Use to surf the web, fetch current information, check the weather, and retrieve other information.",
		schema: z.object({
			query: z.string().describe("The query to use in your search."),
		}),
	},
);

await searchTool.invoke({ query: "What's the weather like?" });

const tools = [searchTool];
const toolNode = new ToolNode(tools);

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
const handleCallModel = (
	llmProvider: Runnable<
		BaseLanguageModelInput,
		AIMessageChunk,
		BaseChatModelCallOptions
	>,
) => {
	return async (state: typeof StateAnnotation.State) => {
		// For versions of @langchain/core < 0.2.3, you must call `.stream()`
		// and aggregate the message from chunks instead of calling `.invoke()`.
		const { messages } = state;
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
	const workflow = new StateGraph(StateAnnotation)
		.addNode("agent", handleCallModel(llmProvider))
		.addNode("tools", toolNode)
		.addEdge("__start__", "agent")
		.addConditionalEdges("agent", routeMessage)
		.addEdge("tools", "agent");

	const agent = workflow.compile();

	return { agent };
};

//TODO add persistence still to chat
const askQuestion = async function* (
	message: Message,
	chatProvider: BaseChatModel,
): AsyncGenerator<AIMessageChunk> {
	const { role, chatId, userId, content } = message;
	const config = { configurable: { thread_id: chatId } };

	const boundChatProvider =
		typeof chatProvider.bindTools === "function"
			? chatProvider.bindTools(tools)
			: null;

	if (!boundChatProvider) {
		throw new Error("Chat provider does not support binding tools.");
	}

	const { agent } = handleWorkFlow(boundChatProvider);

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

	//const stream = await chatProvider.stream(context, config);
	const stream = await agent.stream(
		{
			messages: [{ role: "user", content: content }],
		},
		{ streamMode: "messages" },
	);
	const chunks = [];
	for await (const [chunk, _metadata] of stream) {
		if (isAIMessageChunk(chunk as AIMessageChunk) && chunk.content.length > 0) {
			console.log("chunk", chunk);
			chunks.push(chunk);

			yield chunk as AIMessageChunk;
		}
	}
};

export { askQuestion };
