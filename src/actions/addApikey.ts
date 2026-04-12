"use server";

import { cookies } from "next/headers";
import { authenticate } from "@/lib/auth";
import { encrypt } from "@/lib/encryption/apiKeyEncryption";
import { deleteApiKey, insertApiKey } from "@/lib/nextUtils";
import { invalidateApiKeyCache } from "@/shared/lib/langchain/llmFactory";
import type { LLMProvider } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "addApiKey" });

// this server action is implemented as a showcase. Generally I prefer using regular http routes for flexibility,
// but react server actions are a nice clean way to add simple form submits
export async function addApiKey(
	userId: string,
	provider: string,
	apiKey: string,
) {
	try {
		if (!userId || !provider || !apiKey) {
			throw new Error("Invalid parameters for adding API key");
		}

		const cookieStore = await cookies();
		const accessToken = cookieStore.get("accessToken")?.value ?? "";
		const refreshTokenId = cookieStore.get("refreshToken")?.value ?? "";
		await authenticate(userId, accessToken, refreshTokenId);

		// delete existing key if exists
		await deleteApiKey(userId, provider);

		const encryptedKey = encrypt(apiKey);
		await insertApiKey(userId, provider, encryptedKey);
		await invalidateApiKeyCache(userId, provider as LLMProvider);
		logger.info(
			`API key for ${provider} added successfully for user ${userId}`,
		);

		return { success: true };
	} catch (error) {
		logger.error(
			`Error adding API key: ${error instanceof Error ? error.message : "Unknown error"}`,
		);

		return { success: false };
	}
}
