import { beforeEach, describe, expect, test, vi } from "vitest";
import { getChatModel } from "@/lib/langchain/llmFactory";

vi.spyOn(console, "log").mockImplementation(() => {});

// Mock the dependencies
vi.mock("@langchain/openai");
vi.mock("@langchain/groq");
vi.mock("@langchain/anthropic");
vi.mock("@/lib/helper");
vi.mock("@/lib/encryption/apiKeyEncryption");

// Import mocks after mocking
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { decrypt } from "@/lib/encryption/apiKeyEncryption";
import { getApiKey } from "@/lib/helper";

describe("getChatModel unit tests", () => {
	const userId = "user1";

	beforeEach(() => {
		vi.resetAllMocks();
	});

	test("returns null if API key is null", async () => {
		(getApiKey as any).mockResolvedValue(null);

		const result = await getChatModel(userId, "openai");
		expect(result).toBeNull();
	});
});
