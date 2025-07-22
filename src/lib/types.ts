import type { BaseMessage } from "@langchain/core/messages";
import type { schema } from "@/db";

export type User = typeof schema.usersTable.$inferSelect;
export type RefreshToken = typeof schema.refreshTokensTable.$inferSelect;
export type MessageHistory = typeof schema.messages.$inferSelect;
export type Summary = typeof schema.summaries.$inferInsert;

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
