import { JWTExpired } from "jose/errors";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/csrf", () => ({
	validateOrigin: vi.fn(),
}));

vi.mock("@/lib/jwtConfig", () => ({
	getJwtConfig: vi.fn().mockReturnValue({}),
}));

vi.mock("@/shared/lib/jwt", () => ({
	validateToken: vi.fn(),
}));

// import after mocks
import { validateOrigin } from "@/lib/csrf";
import { proxy } from "@/proxy";
import { validateToken } from "@/shared/lib/jwt";

function makeRequest(
	pathname: string,
	cookies: Record<string, string> = {},
): NextRequest {
	const url = `http://localhost:3000${pathname}`;
	return {
		nextUrl: { pathname },
		url,
		cookies: {
			get: (name: string) =>
				name in cookies ? { value: cookies[name] } : undefined,
		},
	} as unknown as NextRequest;
}

describe("proxy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("/api/* routes", () => {
		test("returns the CSRF error response when validateOrigin rejects", async () => {
			const csrfError = Response.json({ error: "Forbidden" }, { status: 403 });
			vi.mocked(validateOrigin).mockReturnValue(csrfError as never);

			const req = makeRequest("/api/chat/create");
			const res = await proxy(req);

			expect(res).toBe(csrfError);
			expect(validateToken).not.toHaveBeenCalled();
		});

		test("passes through when validateOrigin allows the request", async () => {
			vi.mocked(validateOrigin).mockReturnValue(null);

			const req = makeRequest("/api/auth/get-user");
			const res = await proxy(req);

			expect(res.status).toBe(200);
			expect(validateToken).not.toHaveBeenCalled();
		});
	});

	describe("page routes", () => {
		test("redirects to /login and clears cookies when tokens are missing", async () => {
			const req = makeRequest("/chat/123");
			const res = await proxy(req);

			expect(res.status).toBe(307);
			expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
			expect(validateToken).not.toHaveBeenCalled();
		});

		test("passes through with a valid access token", async () => {
			vi.mocked(validateToken).mockResolvedValue({ sub: "user-id" });

			const req = makeRequest("/dashboard", {
				accessToken: "valid-access-token",
				refreshToken: "refresh-id",
			});
			const res = await proxy(req);

			expect(res.status).toBe(200);
		});

		test("redirects to refresh-token endpoint when the access token expired", async () => {
			vi.mocked(validateToken).mockRejectedValue(
				new JWTExpired("token expired", {}),
			);

			const req = makeRequest("/settings/profile", {
				accessToken: "expired-access-token",
				refreshToken: "refresh-id",
			});
			const res = await proxy(req);

			expect(res.status).toBe(307);
			const location = new URL(res.headers.get("Location") ?? "");
			expect(location.pathname).toBe("/api/auth/refresh-token");
			expect(location.searchParams.get("redirect")).toBe("/settings/profile");
		});

		test("redirects to /login on any other token validation error", async () => {
			vi.mocked(validateToken).mockRejectedValue(new Error("bad token"));

			const req = makeRequest("/profile", {
				accessToken: "garbage",
				refreshToken: "refresh-id",
			});
			const res = await proxy(req);

			expect(res.status).toBe(307);
			expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
		});
	});
});
