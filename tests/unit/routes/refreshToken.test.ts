import type { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RefreshToken } from "@/shared/lib/types";

const fakeRefreshToken: RefreshToken = {
	id: "refreshtoken-id-string",
	userId: "user-id-string",
	accessToken: "valid-access-token",
	ipAddress: "client-ip-string",
	expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
	createdAt: new Date(),
};

vi.mock("@/lib/nextUtils", () => ({
	getClientIP: vi.fn().mockReturnValue("client-ip-string"),
	rateLimiter: vi.fn().mockReturnValue(true),
	getRefreshToken: vi.fn().mockResolvedValue(null),
	deleteRefreshToken: vi.fn().mockResolvedValue(true),
	generateRefreshToken: vi.fn().mockResolvedValue("new-refresh-token"),
	insertRefreshToken: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/shared/lib/jwt", () => ({
	getUserSubFromJWT: vi.fn().mockReturnValue("user-id-string"),
	generateAccessToken: vi.fn().mockResolvedValue("new-access-token"),
}));

vi.mock("@/lib/jwtConfig", () => ({
	getJwtConfig: vi.fn().mockReturnValue({}),
}));

// import after mocks
import { POST } from "@/app/api/auth/refresh-token/route";
import * as helperMock from "@/lib/nextUtils";
import * as jwtMock from "@/shared/lib/jwt";
import { getJwtConfig } from "@/lib/jwtConfig";

describe("api/auth/refresh-token", () => {
	// Fake NextRequest
	const req = {
		cookies: new Map([
			["accessToken", { value: "valid-access-token" }],
			["refreshToken", { value: "refreshtoken-id-string" }],
		]),
		nextUrl: new URL("http://localhost/api/refresh?redirect=/dashboard"),
		url: "http://localhost/api/refresh?redirect=/dashboard",
	} as unknown as NextRequest;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(jwtMock.getUserSubFromJWT).mockReturnValue("user-id-string");
		vi.mocked(jwtMock.generateAccessToken).mockResolvedValue("new-access-token");
		vi.mocked(helperMock.getClientIP).mockReturnValue("client-ip-string");
		vi.mocked(helperMock.getRefreshToken).mockResolvedValue(fakeRefreshToken);
		vi.mocked(helperMock.deleteRefreshToken).mockResolvedValue(true);
		vi.mocked(helperMock.generateRefreshToken).mockResolvedValue(
			"new-refresh-token",
		);
		vi.mocked(helperMock.insertRefreshToken).mockResolvedValue(true);
	});

	test("validate mock setup", async () => {
		const userId = jwtMock.getUserSubFromJWT(
			"valid-access-token",
			getJwtConfig(),
		);
		expect(userId).toBe("user-id-string");

		const refreshToken = await helperMock.getRefreshToken(
			"refreshtoken-id-string",
		);
		expect(refreshToken).toEqual(fakeRefreshToken);
	});

	test("POST redirects and sets new tokens in cookies", async () => {
		const res: NextResponse = await POST(req);
		expect(res.status).toBe(307);
		const cookies = res.cookies;
		expect(cookies.get("accessToken")?.value).toBe("new-access-token");
		expect(cookies.get("refreshToken")?.value).toBe("new-refresh-token");
		expect(res.headers.get("Location")).toBe("http://localhost/dashboard");
	});
});
