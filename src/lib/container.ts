// src/lib/container.ts
import {
	createChatContext,
	insertMessage,
	updateTokenUsage,
} from "@/lib/helper";
import { calculateApproxTokens, routeMessage } from "@/lib/langchain/llmHelper";
import { createChatPrompt } from "@/lib/langchain/prompts";
import { tools } from "@/lib/langchain/tools";
import { chatContextManager } from "@/lib/services/chatContextManager";

export interface AgentDeps {
	chatContextManager: typeof chatContextManager;
	insertMessage: typeof insertMessage;
	updateTokenUsage: typeof updateTokenUsage;
	createChatContext: typeof createChatContext;
	calculateApproxTokens: typeof calculateApproxTokens;
	createChatPrompt: typeof createChatPrompt;
	routeMessage: typeof routeMessage;
	tools: typeof tools;
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
};
