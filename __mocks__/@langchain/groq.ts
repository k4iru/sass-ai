import { vi } from "vitest";

export const ChatGroq = vi.fn().mockImplementation((opts) => ({
	...opts,
	type: "groq",
}));
