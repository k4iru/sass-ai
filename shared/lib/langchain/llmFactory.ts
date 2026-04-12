import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { decrypt } from "@/lib/encryption/apiKeyEncryption";
import { getApiKey } from "@/lib/nextUtils";
import { AVAILABLE_LLM_PROVIDERS } from "@/shared/constants";
import { MODEL_REGISTRY } from "@/shared/lib/models";
import type { LLMProvider } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";
import { getRedis } from "@/shared/redis";

const logger = getLogger({ module: "llmFactory" });

const CIPHERTEXT_TTL_SECONDS = 60 * 15;

function apiKeyCacheKey(userId: string, provider: LLMProvider): string {
	return `apikey:cipher:${userId}:${provider}`;
}

async function fetchEncryptedKey(
	userId: string,
	provider: LLMProvider,
): Promise<string | null> {
	const cacheKey = apiKeyCacheKey(userId, provider);

	try {
		const redis = getRedis();
		const cached = await redis.get(cacheKey);
		if (cached) {
			logger.info("apikey redis hit", { userId, provider });
			return cached;
		}
	} catch (err) {
		logger.warn("redis get failed, falling through to db", { err });
	}

	const ciphertext = await getApiKey(userId, provider);
	if (ciphertext === null) return null;

	try {
		const redis = getRedis();
		await redis.set(cacheKey, ciphertext, "EX", CIPHERTEXT_TTL_SECONDS);
	} catch (err) {
		logger.warn("redis set failed, continuing without cache", { err });
	}

	return ciphertext;
}

export async function invalidateApiKeyCache(
	userId: string,
	provider?: LLMProvider,
): Promise<void> {
	const providers: readonly LLMProvider[] = provider
		? [provider]
		: (AVAILABLE_LLM_PROVIDERS as readonly LLMProvider[]);
	const keys = providers.map((p) => apiKeyCacheKey(userId, p));

	try {
		const redis = getRedis();
		await redis.del(...keys);
		logger.info("invalidated apikey cache", { userId, providers });
	} catch (err) {
		logger.warn("redis del failed during invalidation", { err });
	}
}

export async function getChatModel(
	userId: string,
	provider: LLMProvider,
	modelId: string,
): Promise<[BaseChatModel, BaseChatModel] | null> {
	const ciphertext = await fetchEncryptedKey(userId, provider);
	if (ciphertext === null) return null;

	const decryptedKey = decrypt(ciphertext);
	const registry = MODEL_REGISTRY[provider];

	switch (provider) {
		case "openai":
			return [
				new ChatOpenAI({ model: modelId, apiKey: decryptedKey }),
				new ChatOpenAI({
					model: registry.summaryModel,
					apiKey: decryptedKey,
					streaming: false,
				}),
			];
		case "anthropic":
			return [
				new ChatAnthropic({ model: modelId, apiKey: decryptedKey }),
				new ChatAnthropic({
					model: registry.summaryModel,
					apiKey: decryptedKey,
					streaming: false,
				}),
			];
		default:
			return null;
	}
}
