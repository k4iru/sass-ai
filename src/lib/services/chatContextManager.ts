import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LRUCache } from "lru-cache";
import { summarizeMessages } from "@/shared/lib/langchain/llmHelper";
import type { ChatContext } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "ChatContextManager" });

// singleton class to manage chat contexts in memory with LRU caching
class ChatContextManager {
	private static instance: ChatContextManager;
	private cache: LRUCache<string, ChatContext>;
	private pendingSummarizations = new Set<string>();

	private constructor() {
		this.cache = new LRUCache<string, ChatContext>({
			max: 200,
			ttl: 1000 * 60 * 30,
			allowStale: false,
		});
	}

	static getInstance(): ChatContextManager {
		if (!ChatContextManager.instance) {
			ChatContextManager.instance = new ChatContextManager();
		}
		return ChatContextManager.instance;
	}

	getChatContext(userId: string, chatId: string): ChatContext | undefined {
		const chatKey = `${userId}-${chatId}`;
		return this.cache.get(chatKey);
	}

	setChatContext(
		userId: string,
		chatId: string,
		chatContext: ChatContext,
	): void {
		const chatKey = `${userId}-${chatId}`;
		this.cache.set(chatKey, chatContext);
	}

	async updateSummaryInBackground(
		userId: string,
		chatId: string,
		summaryProvider: BaseChatModel,
	): Promise<void> {
		const chatKey = `${userId}-${chatId}`;

		if (this.pendingSummarizations.has(chatKey)) {
			logger.info(`summarization in progress for chat: ${chatKey}`);
			return;
		}

		this.pendingSummarizations.add(chatKey);
		try {
			const chatContext = this.cache.get(chatKey);

			if (!chatContext) {
				logger.warn(`Chat context not found in cache for ${chatKey}`);
				return;
			}

			const { summary, lastSummaryIndex } = await summarizeMessages(
				chatContext,
				summaryProvider,
			);

			// Update the cached object directly
			chatContext.summary = summary;
			chatContext.lastSummaryIndex = lastSummaryIndex;
			logger.info(`Background summary completed for chat ${chatKey}`);
		} catch (error) {
			logger.error(
				`Background summarization failed for chat ${chatKey}:`,
				error,
			);
		} finally {
			this.pendingSummarizations.delete(chatKey);
		}
		return;
	}

	// where chatKey is `${userId}-${chatId}`
	isPendingSummarization(chatKey: string): boolean {
		return this.pendingSummarizations.has(chatKey);
	}

	// where chatKey is `${userId}-${chatId}`
	deleteChatContext(chatKey: string): boolean {
		return this.cache.delete(chatKey);
	}

	getCacheStats() {
		return {
			size: this.cache.size,
			max: this.cache.max,
			pendingSummarizations: this.pendingSummarizations.size,
		};
	}
}

export const chatContextManager = ChatContextManager.getInstance();
