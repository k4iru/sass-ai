import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type { schema } from "@/db";
import type { chatContextManager } from "@/lib/services/chatContextManager";
import type { VERIFICATION_TYPES } from "./constants";

export type User = typeof schema.usersTable.$inferSelect;
export type RefreshToken = typeof schema.refreshTokensTable.$inferSelect;
export type MessageHistory = typeof schema.messages.$inferSelect;
export type Summary = typeof schema.summaries.$inferInsert;
export type LLMProvider = "openai" | "groq" | "anthropic";

export interface AuthUser {
	id: string;
	emailVerified: boolean;
}

export type Message = {
	id: string;
	role: "human" | "ai" | "placeholder";
	chatId: string;
	userId: string;
	content: string;
	createdAt: Date;
	type?: string;
	provider: string;
	tokens?: number;
	messageOrder: number;
};

export type AccessCode = {
	id: string;
	userId: string;
	accessCode: string;
	verificationType: (typeof VERIFICATION_TYPES)[number];
	createdAt: Date;
	expiryDate: Date;
};

export type MessageResponse = {
	success: boolean;
	message: string;
};

export type ChatContext = {
	userId: string;
	chatId: string;
	messages: Message[];
	approximateTotalTokens: number;
	summary: string;
	lastSummaryIndex: number;
};

export type Chat = {
	id: string;
	userId: string;
	title: string;
	model: string;
	createdAt: Date;
};

export type Theme = {
	theme: "light" | "dark";
	toggleTheme: () => void;
};

export interface SignupRequestBody {
	first: string;
	last: string;
	email: string;
	password: string;
}

export interface AgentDeps {
	chatContextManager: typeof chatContextManager;
	insertMessage: (messages: Message[]) => Promise<void> | void;
	updateTokenUsage: (userId: string, chatId: string, tokens: number) => void;
	createChatContext: (message: Message) => Promise<any>;
	calculateApproxTokens: (text: string) => number;
	createChatPrompt: () => ChatPromptTemplate;
	routeMessage: "__end__" | "tools";
	tools: Record<string, unknown>;
}

export interface AgentInit {
	chatProvider: BaseChatModel;
	summaryProvider: BaseChatModel;
	deps: AgentDeps;
}
