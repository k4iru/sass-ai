import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

type LLMProvider = "openai" | "groq" | "anthropic";

export function getChatModel(provider: LLMProvider): BaseChatModel {
	switch (provider) {
		case "openai":
			return new ChatOpenAI({
				model: "o4-mini-2025-04-16",
			});
		case "groq":
			return new ChatGroq({
				model: "mixtral-8x7b-32768",
			});
		case "anthropic":
			return new ChatAnthropic({
				model: "anthropic",
			});
	}
}
