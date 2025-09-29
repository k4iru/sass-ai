import { vi } from "vitest";

export const ChatAnthropic = vi.fn().mockImplementation((opts) => ({
	...opts,
	type: "anthropic",
}));
