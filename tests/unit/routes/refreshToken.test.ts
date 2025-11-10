import type { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RefreshToken } from "@/lib/types";

const fakeRefreshToken: RefreshToken = {
	id: "refreshtoken-id-string",
	userId: "user-id-string",
	accessToken: "valid-access-token",
	ipAddress: "client-ip-string",
	expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
	createdAt: new Date(),
};

vi.mock("@/lib/helper");
vi.mock("@/lib/jwt");
vi.mocked(helperMock.getRefreshToken).mockResolvedValue(fakeRefreshToken);

// imoprt after mocks
import { POST } from "@/app/api/auth/refresh-token/route";
import * as helperMock from "@/lib/helper";
import * as jwtMock from "@/lib/jwt";

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
	});

	test("validate mock setup", async () => {
		const userId = jwtMock.getUserSubFromJWT("valid-access-token");
		expect(userId).toBe("user-id-string");

		const getRefreshToken = await helperMock.getRefreshToken(
			"refreshtoken-id-string",
		);
		expect(getRefreshToken).toEqual(fakeRefreshToken);
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
