import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { END } from "@langchain/langgraph";
import type { ZodObject, ZodString, ZodTypeAny } from "zod";
import {
	createChatContext,
	insertMessage,
	updateTokenUsage,
} from "@/lib/helper";
import {
	calculateApproxTokens,
	routeMessage,
	updateChatContext,
	updateDatabase,
} from "@/lib/langchain/llmHelper";
import { createChatPrompt } from "@/lib/langchain/prompts";
import { tools } from "@/lib/langchain/tools";
import { chatContextManager } from "@/lib/services/chatContextManager";
import type {
	ChatContext,
	ChatContextManager,
	Message,
	StateAnnotation,
} from "./types";

export interface AgentDeps {
	chatContextManager: typeof chatContextManager;
	insertMessage(messages: Message[]): Promise<boolean>;
	updateTokenUsage(
		userId: string,
		chatId: string,
		tokensUsed: number,
	): Promise<void>;
	calculateApproxTokens(content: string): number;
	createChatPrompt(): ChatPromptTemplate;
	routeMessage(state: typeof StateAnnotation.State): string | typeof END;
	createChatContext(message: Message): Promise<ChatContext>;
	tools: DynamicStructuredTool<
		ZodObject<
			{
				query: ZodString;
			},
			"strip",
			ZodTypeAny,
			{
				query: string;
			},
			{
				query: string;
			}
		>,
		{
			query: string;
		},
		{
			query: string;
		},
		string
	>[];
	updateChatContext(
		context: ChatContext,
		contextManager: ChatContextManager,
		humanMessage: Message,
		aiMessage: Message,
		summaryProvider: BaseChatModel,
		calculateApproxTokens: (text: string) => number,
	): void;
	updateDatabase(
		humanMessage: Message,
		aiMessage: Message,
		exactTokenUsage: number,
		insertMessage: (msgs: Message[]) => Promise<boolean>,
		updateTokenUsage: (
			userId: string,
			chatId: string,
			token: number,
		) => Promise<void>,
	): Promise<void>;
}

export const container: AgentDeps = {
	chatContextManager: chatContextManager,
	insertMessage: insertMessage,
	updateTokenUsage: updateTokenUsage,
	createChatContext: createChatContext,
	calculateApproxTokens: calculateApproxTokens,
	createChatPrompt: createChatPrompt,
	routeMessage: routeMessage,
	tools: tools,
	updateChatContext: updateChatContext,
	updateDatabase: updateDatabase,
};
