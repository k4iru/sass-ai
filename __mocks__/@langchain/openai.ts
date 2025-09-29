import { vi } from "vitest";

export const ChatOpenAI = vi.fn().mockImplementation((opts) => ({
	...opts,
	type: "openai",
}));
