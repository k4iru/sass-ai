"use server";

import { authenticate } from "@/lib/auth";
import { encrypt } from "@/lib/encryption/apiKeyEncryption";
import { deleteApiKey, insertApiKey } from "@/lib/helper";

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
		await authenticate(userId);

		// delete existing key if exists
		await deleteApiKey(userId, provider);

		const encryptedKey = encrypt(apiKey);
		await insertApiKey(userId, provider, encryptedKey);
		console.log(
			`API key for ${provider} added successfully for user ${userId}`,
		);
		return { success: true };
	} catch (error) {
		console.error(
			`Error adding API key: ${error instanceof Error ? error.message : "Unknown error"}`,
		);

		return { success: false };
	}
}
