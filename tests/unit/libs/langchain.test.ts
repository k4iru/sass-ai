import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the dependencies
vi.mock("@langchain/openai");
vi.mock("@langchain/groq");
vi.mock("@langchain/anthropic");


// Import mocks after mocking
import { ChatOpenAI, fakeOpenAiModel, fakeOpenAiSummaryModel } from "@langchain/openai";
import * as helper from "@/lib/helper";
import * as encryption from "@/lib/encryption/apiKeyEncryption";
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
    expect(result).toHaveLength(2);

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

    // Check identity against fakes from mock file
    expect(result![0]).toBe(fakeOpenAiModel);
    expect(result![1]).toBe(fakeOpenAiSummaryModel);
  });

  test("returns null if API key is null", async () => {
		vi.spyOn(helper, "getApiKey").mockResolvedValue(null);
    const result = await getChatModel(userId, "openai");
    expect(result).toBeNull();
  });
});