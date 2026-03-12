import { beforeEach, describe, expect, test, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { authenticateViaHttpToken } from "@/server/lib/util";

describe("authenticateViaHttpToken()", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("returns null when verify endpoint returns non-OK status", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 401 });
		const result = await authenticateViaHttpToken(
			"bad-token",
			"http://localhost:3000",
		);
		expect(result).toBeNull();
	});

	test("returns { userId, chatId } when verify endpoint returns 200", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ userId: "user-123", chatId: "chat-456" }),
		});
		const result = await authenticateViaHttpToken(
			"valid-token",
			"http://localhost:3000",
		);
		expect(result).toEqual({ userId: "user-123", chatId: "chat-456" });
	});

	test("makes a POST request to the correct URL with the token in the body", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ userId: "u", chatId: "c" }),
		});
		await authenticateViaHttpToken("my-token", "http://localhost:3000");
		expect(mockFetch).toHaveBeenCalledWith(
			"http://localhost:3000/api/auth/verify-ws-token",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: "my-token" }),
			},
		);
	});
});
