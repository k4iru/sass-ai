import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/shared/redis", () => ({
	getRedis: vi.fn(() => ({
		get: vi.fn(),
		del: vi.fn().mockResolvedValue(1),
	})),
}));

import { POST } from "@/app/api/auth/verify-ws-token/route";
import * as redisMock from "@/shared/redis";

const makeReq = (body: object) =>
	({
		json: vi.fn().mockResolvedValue(body),
	}) as unknown as NextRequest;

describe("POST /api/auth/verify-ws-token", () => {
	let mockRedisGet: ReturnType<typeof vi.fn>;
	let mockRedisDel: ReturnType<typeof vi.fn>;

	// need to reset the mock implementations before each test to ensure clean state
	beforeEach(() => {
		vi.clearAllMocks();
		mockRedisGet = vi.fn();
		mockRedisDel = vi.fn().mockResolvedValue(1);
		vi.mocked(redisMock.getRedis).mockReturnValue({
			get: mockRedisGet,
			del: mockRedisDel,
		} as never);
	});

	test("returns 400 when token is missing from body", async () => {
		const req = makeReq({});
		const res = await POST(req);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ error: "Missing token" });
	});

	test("returns 401 when token is not found in Redis", async () => {
		mockRedisGet.mockResolvedValue(null);
		const req = makeReq({ token: "unknown-token" });
		const res = await POST(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Invalid or expired token" });
	});

	test("returns 200 with { userId, chatId } for a valid token", async () => {
		mockRedisGet.mockResolvedValue(
			JSON.stringify({ userId: "user-123", chatId: "chat-456" }),
		);
		const req = makeReq({ token: "valid-token" });
		const res = await POST(req);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ userId: "user-123", chatId: "chat-456" });
	});

	test("deletes the Redis key after successful verification (one-time use)", async () => {
		mockRedisGet.mockResolvedValue(
			JSON.stringify({ userId: "user-123", chatId: "chat-456" }),
		);
		const req = makeReq({ token: "valid-token" });
		await POST(req);
		expect(mockRedisDel).toHaveBeenCalledWith("ws:token:valid-token");
	});
});
