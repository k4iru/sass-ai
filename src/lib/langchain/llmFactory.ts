import { getApiKey } from "../helper";
import { decrypt } from "../encryption/apiKeyEncryption";
import { LRUCache } from "lru-cache";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

type LLMProvider = "openai" | "groq" | "anthropic";

const chatModelCache = new LRUCache<string, BaseChatModel>({
	max: 100,
	ttl: 1000 * 60 * 15,
	allowStale: false,
});

export async function getChatModel(
	userId: string,
	provider: LLMProvider,
): Promise<BaseChatModel | null> {
	const cacheKey = `${userId}-${provider}`;

	if (chatModelCache.has(cacheKey)) {
		console.log("cache hit for", provider);
		return chatModelCache.get(cacheKey) as BaseChatModel;
	}
	console.log("not in cache, fetching API key for", provider);
	const apiKey = await getApiKey(userId, provider);
	if (apiKey === null) return null;
	const decryptedKey = decrypt(apiKey);

	let model: BaseChatModel;

	switch (provider) {
		case "openai":
			model = new ChatOpenAI({
				model: "o4-mini-2025-04-16",
				apiKey: decryptedKey,
			});
			break;
		case "groq":
			model = new ChatGroq({
				model: "mixtral-8x7b-32768",
				apiKey: decryptedKey,
			});
			break;
		case "anthropic":
			model = new ChatAnthropic({
				model: "anthropic",
				apiKey: decryptedKey,
			});
			break;
		default:
			return null;
	}
	chatModelCache.set(cacheKey, model);
	return model;
}
