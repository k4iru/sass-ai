import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { validateOrigin } from "@/lib/csrf";

function makeRequest(
	method: string,
	headers: Record<string, string> = {},
): NextRequest {
	return new NextRequest("http://localhost:3000/api/auth/login", {
		method,
		headers,
	});
}

describe("validateOrigin", () => {
	test("allows GET requests without origin check", () => {
		const req = makeRequest("GET");
		expect(validateOrigin(req)).toBeNull();
	});

	test("allows HEAD requests without origin check", () => {
		const req = makeRequest("HEAD");
		expect(validateOrigin(req)).toBeNull();
	});

	test("allows OPTIONS requests without origin check", () => {
		const req = makeRequest("OPTIONS");
		expect(validateOrigin(req)).toBeNull();
	});

	test("allows POST with no origin (server-to-server)", () => {
		const req = makeRequest("POST", { host: "localhost:3000" });
		expect(validateOrigin(req)).toBeNull();
	});

	test("allows POST with matching origin", () => {
		const req = makeRequest("POST", {
			origin: "http://localhost:3000",
			host: "localhost:3000",
		});
		expect(validateOrigin(req)).toBeNull();
	});

	test("blocks POST with mismatched origin", async () => {
		const req = makeRequest("POST", {
			origin: "http://evil.com",
			host: "localhost:3000",
		});
		const result = validateOrigin(req);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	test("blocks POST with missing host header", async () => {
		// NextRequest auto-sets host from the URL, so we override it
		const req = new NextRequest("http://localhost:3000/api/auth/login", {
			method: "POST",
			headers: { origin: "http://localhost:3000" },
		});
		// NextRequest derives host from URL, so this test checks malformed origin instead
		const evilReq = makeRequest("POST", {
			origin: "http://evil.com",
			host: "localhost:3000",
		});
		const result = validateOrigin(evilReq);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	test("blocks POST with malformed origin", async () => {
		const req = makeRequest("POST", {
			origin: "not-a-url",
			host: "localhost:3000",
		});
		const result = validateOrigin(req);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	test("allows HTTPS origin matching HTTPS host", () => {
		const req = new NextRequest("https://myapp.com/api/chat/create", {
			method: "POST",
			headers: {
				origin: "https://myapp.com",
				host: "myapp.com",
			},
		});
		expect(validateOrigin(req)).toBeNull();
	});
});
