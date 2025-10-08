import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the dependencies
vi.mock("@langchain/openai");
vi.mock("@langchain/groq");
vi.mock("@langchain/anthropic");

// Import mocks after mocking
import { ChatOpenAI } from "@langchain/openai";
import * as encryption from "@/lib/encryption/apiKeyEncryption";
import * as helper from "@/lib/helper";
import { chatModelCache, getChatModel } from "@/lib/langchain/llmFactory";

describe("getChatModel unit tests", () => {
	const userId = "user1";

	beforeEach(() => {
		vi.clearAllMocks();
		chatModelCache.clear(); // clear chat model cache
	});

	test("ChatOpenAI mock is called when getChatModel is invoked", async () => {
		// Arrange
		vi.spyOn(helper, "getApiKey").mockResolvedValue("encrypted_key");
		vi.spyOn(encryption, "decrypt").mockReturnValue("decrypted_key");

		// Act
		const result = await getChatModel(userId, "openai");

		// Assert
		expect(ChatOpenAI).toHaveBeenCalledTimes(2);
		expect(result).not.toBeNull();
		expect(Array.isArray(result)).toBe(true);
		if (!result) throw new Error("Expected result not to be null");

		// Verify constructor calls
		expect(ChatOpenAI).toHaveBeenNthCalledWith(1, {
			model: "o4-mini-2025-04-16",
			apiKey: "decrypted_key",
		});
		expect(ChatOpenAI).toHaveBeenNthCalledWith(2, {
			model: "o4-mini-2025-04-16",
			apiKey: "decrypted_key",
			streaming: false,
		});

		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
	});

	test("returns null if API key is null", async () => {
		vi.spyOn(helper, "getApiKey").mockResolvedValue(null);
		const result = await getChatModel(userId, "openai");
		expect(result).toBeNull();
	});

	test("caches model after first request", async () => {
		vi.spyOn(helper, "getApiKey").mockResolvedValue("encrypted_key");
		vi.spyOn(encryption, "decrypt").mockReturnValue("decrypted_key");

		const result = await getChatModel(userId, "openai");
		expect(ChatOpenAI).toHaveBeenCalledTimes(2);
		expect(result).not.toBeNull();
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(2);

		expect(chatModelCache.has(`${userId}-openai`)).toBe(true);
	});
});
