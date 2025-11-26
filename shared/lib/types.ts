import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, type CompiledStateGraph } from "@langchain/langgraph";
import type { VERIFICATION_TYPES } from "@/shared/constants";
import type { schema } from "@/shared/db";

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

// define state for langgraph
export const StateAnnotation = Annotation.Root({
	messages: Annotation<BaseMessageLike[]>({
		reducer: (x, y) => x.concat(y),
	}),
	summary: Annotation<string>({
		reducer: (x, y) => y ?? x,
	}),
	recent_messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => y ?? x,
	}),
	input: Annotation<string>({
		reducer: (x, y) => y ?? x,
	}),
});

// Type alias for the compiled graph
export type CompiledAgent = CompiledStateGraph<
	typeof StateAnnotation.State,
	Partial<typeof StateAnnotation.Update>,
	"__start__" | "agent" | "tools"
>;

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

export interface ChatContextManager {
	getChatContext(userId: string, chatId: string): ChatContext | undefined;
	setChatContext(
		userId: string,
		chatId: string,
		chatContext: ChatContext,
	): void;
	updateSummaryInBackground(
		userId: string,
		chatId: string,
		summaryProvider: BaseChatModel,
	): Promise<void>;
	isPendingSummarization(chatId: string): boolean;
	deleteChatContext(chatId: string): boolean;
	getCacheStats(): {
		size: number;
		max: number;
		pendingSummarizations: number;
	};
}

export type JwtConfig = {
	JWT_SECRET: string;
	JWT_EXPIRY: string;
	JWT_AUD: string;
	JWT_ISS: string;
};
