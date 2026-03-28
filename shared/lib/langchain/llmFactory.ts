import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { LRUCache } from "lru-cache";
import { decrypt } from "@/lib/encryption/apiKeyEncryption";
import { getApiKey } from "@/lib/nextUtils";
import { MODEL_REGISTRY } from "@/shared/lib/models";
import type { LLMProvider } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "llmFactory" });

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
	modelId: string,
): Promise<[BaseChatModel, BaseChatModel] | null> {
	const cacheKey = `${userId}-${provider}-${modelId}`;

	const cached = chatModelCache.get(cacheKey);
	if (cached) {
		logger.info(`cache hit for ${cacheKey}`);
		return cached;
	}

	logger.info("not in cache, fetching API key for", {
		provider,
		model: modelId,
	});
	const apiKey = await getApiKey(userId, provider);

	if (apiKey === null) return null;
	const decryptedKey = decrypt(apiKey);

	const registry = MODEL_REGISTRY[provider];
	let model: BaseChatModel;
	let summaryProvider: BaseChatModel;

	switch (provider) {
		case "openai":
			model = new ChatOpenAI({
				model: modelId,
				apiKey: decryptedKey,
			});
			summaryProvider = new ChatOpenAI({
				model: registry.summaryModel,
				apiKey: decryptedKey,
				streaming: false,
			});
			break;
		case "anthropic":
			model = new ChatAnthropic({
				model: modelId,
				apiKey: decryptedKey,
			});
			summaryProvider = new ChatAnthropic({
				model: registry.summaryModel,
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
