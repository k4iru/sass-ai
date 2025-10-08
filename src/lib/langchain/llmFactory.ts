import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { LRUCache } from "lru-cache";
import { decrypt } from "@/lib/encryption/apiKeyEncryption";
import { getApiKey } from "@/lib/helper";
import { logger } from "@/lib/logger";
import type { LLMProvider } from "@/lib/types";

// TODO - split get model and model creation into separate functions
// lrucache is not shared between servers. Maybe move to redis or memcache
// but for now since only running on one server should be okay.
export const chatModelCache = new LRUCache<
	string,
	[BaseChatModel, BaseChatModel]
>({
	max: 100,
	ttl: 1000 * 60 * 15,
	allowStale: false,
});

export async function getChatModel(
	userId: string,
	provider: LLMProvider,
): Promise<[BaseChatModel, BaseChatModel] | null> {
	const cacheKey = `${userId}-${provider}`;

	const cached = chatModelCache.get(cacheKey);
	if (cached) {
		logger.info(`cache hit for ${userId}-${provider}`);
		return cached;
	}

	logger.info("not in cache, fetching API key for", provider);
	const apiKey = await getApiKey(userId, provider);

	// invalid api key
	if (apiKey === null) return null;
	const decryptedKey = decrypt(apiKey);

	let model: BaseChatModel;
	let summaryProvider: BaseChatModel;

	switch (provider) {
		case "openai":
			model = new ChatOpenAI({
				model: "o4-mini-2025-04-16",
				apiKey: decryptedKey,
			});
			summaryProvider = new ChatOpenAI({
				model: "o4-mini-2025-04-16",
				apiKey: decryptedKey,
				streaming: false,
			});
			break;
		case "groq":
			model = new ChatGroq({
				model: "mixtral-8x7b-32768",
				apiKey: decryptedKey,
			});
			summaryProvider = new ChatGroq({
				model: "mixtral-8x7b-32768",
				apiKey: decryptedKey,
				streaming: false,
			});
			break;
		case "anthropic":
			model = new ChatAnthropic({
				model: "anthropic",
				apiKey: decryptedKey,
			});
			summaryProvider = new ChatAnthropic({
				model: "anthropic",
				apiKey: decryptedKey,
				streaming: false,
			});
			break;
		default:
			return null;
	}
	chatModelCache.set(cacheKey, [model, summaryProvider]);
	return [model, summaryProvider];
}
