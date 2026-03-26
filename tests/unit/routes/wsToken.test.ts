import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("uuid", () => ({ v4: vi.fn(() => "mock-uuid-token") }));
vi.mock("@/lib/jwtConfig", () => ({ getJwtConfig: vi.fn(() => ({})) }));
vi.mock("@/shared/lib/jwt", () => ({
	validateToken: vi.fn(),
}));
vi.mock("@/shared/redis", () => ({
	getRedis: vi.fn(() => ({ set: vi.fn().mockResolvedValue("OK") })),
}));
vi.mock("@/lib/auth", () => ({
	authenticate: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/auth/ws-token/route";
import * as jwtMock from "@/shared/lib/jwt";
import * as redisMock from "@/shared/redis";

const makeReq = (accessTokenValue: string | undefined, body: object) =>
	({
		cookies: {
			get: (name: string) => {
				if (name === "accessToken" && accessTokenValue !== undefined)
					return { value: accessTokenValue };
				if (name === "refreshToken")
					return { value: "mock-refresh-token" };
				return undefined;
			},
		},
		json: vi.fn().mockResolvedValue(body),
	}) as unknown as NextRequest;

describe("POST /api/auth/ws-token", () => {
	let mockRedisSet: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRedisSet = vi.fn().mockResolvedValue("OK");
		vi.mocked(redisMock.getRedis).mockReturnValue({
			set: mockRedisSet,
		} as never);
	});

	test("returns 401 when no valid accessToken cookie", async () => {
		vi.mocked(jwtMock.validateToken).mockResolvedValue(null);
		const req = makeReq(undefined, { chatId: "chat-123" });
		const res = await POST(req);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toEqual({ error: "Unauthorized" });
	});

	test("returns 401 when JWT is invalid", async () => {
		vi.mocked(jwtMock.validateToken).mockResolvedValue(null);
		const req = makeReq("bad-token", { chatId: "chat-123" });
		const res = await POST(req);
		expect(res.status).toBe(401);
	});

	test("returns 200 with { token } for a valid JWT", async () => {
		vi.mocked(jwtMock.validateToken).mockResolvedValue({ sub: "user-123" });
		const req = makeReq("valid-access-token", { chatId: "chat-123" });
		const res = await POST(req);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ token: "mock-uuid-token" });
	});

	test("stores correct payload in Redis with 30s TTL", async () => {
		vi.mocked(jwtMock.validateToken).mockResolvedValue({ sub: "user-123" });
		const req = makeReq("valid-access-token", { chatId: "chat-123" });
		await POST(req);
		expect(mockRedisSet).toHaveBeenCalledWith(
			"ws:token:mock-uuid-token",
			JSON.stringify({ userId: "user-123", chatId: "chat-123" }),
			"EX",
			30,
		);
	});
});
