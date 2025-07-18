import type { BaseMessage } from "@langchain/core/messages";
import type { ConversationSummaryMemory } from "langchain/memory";

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
};

export type MessageResponse = {
	success: boolean;
	message: string;
};

export type ChatContext = {
	messages: BaseMessage[];
	totalTokens: number;
	summary?: string;
	summaryMemory?: ConversationSummaryMemory;
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
