import { JWTExpired } from "jose/errors";
import { type NextRequest, NextResponse } from "next/server";
import { validateOrigin } from "@/lib/csrf";
import { getClientEnv } from "@/lib/env/env.client";
import { getJwtConfig } from "@/lib/jwtConfig";
import { validateToken } from "@/shared/lib/jwt";

export async function middleware(req: NextRequest) {
	const pathname = req.nextUrl.pathname;

	// CSRF protection: validate Origin header on all API routes
	if (pathname.startsWith("/api/")) {
		const csrfError = validateOrigin(req);
		if (csrfError) return csrfError;
		return NextResponse.next();
	}

	// Auth protection for page routes
	try {
		const refreshToken = req.cookies.get("refreshToken")?.value;
		const accessToken = req.cookies.get("accessToken")?.value;

		// neither cookie is set log in. if protected route.
		if (!refreshToken || !accessToken) {
			const response = NextResponse.redirect(
				new URL("/login", getClientEnv().NEXT_PUBLIC_API_URL),
			);
			response.cookies.delete("accessToken");
			response.cookies.delete("refreshToken");
			return response;
		}

		// if this doesn't throw than we are good.
		// throws if token expired or invalid token
		const validToken = await validateToken(getJwtConfig(), accessToken);

		// Optional: Add additional security checks
		if (!validToken) {
			throw new Error("Invalid token claims");
		}
		return NextResponse.next();
	} catch (err) {
		if (err instanceof JWTExpired) {
			const path = req.nextUrl.pathname;
			const redirectURL = new URL(
				"/api/auth/refresh-token",
				getClientEnv().NEXT_PUBLIC_API_URL,
			);
			redirectURL.searchParams.set("redirect", path);
			return NextResponse.redirect(redirectURL);
		}
		return NextResponse.redirect(
			new URL("/login", getClientEnv().NEXT_PUBLIC_API_URL),
		);
	}
}

export const config = {
	matcher: [
		"/api/:path*", // CSRF protection for all API routes
		"/chat/:path*", // matches /chat and anything after
		"/dashboard/:path*", // matches /dashboard and anything after
		"/api-keys/:path*",
		"/settings/:path*",
		"/profile/:path*",
	],
};
