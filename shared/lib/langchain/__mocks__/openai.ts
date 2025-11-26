import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { vi } from "vitest";

export const fakeOpenAiModel: BaseChatModel = {
	invoke: vi.fn(),
} as unknown as BaseChatModel;

export const fakeOpenAiSummaryModel: BaseChatModel = {
	invoke: vi.fn(),
} as unknown as BaseChatModel;

export const ChatOpenAI = vi.fn().mockImplementation((_opts) => {
	// Always return the fake model
	if (_opts?.streaming === false) return fakeOpenAiSummaryModel;
	return fakeOpenAiModel;
});
