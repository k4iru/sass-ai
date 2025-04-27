import { type NextRequest, NextResponse } from "next/server";
import { validateToken, verifyToken } from "./lib/jwt";
import { JWTExpired } from "jose/errors";

export async function middleware(req: NextRequest) {
	console.log("in middleware");
	// get cookies
	try {
		const refreshToken = req.cookies.get("refreshToken")?.value;
		const accessToken = req.cookies.get("accessToken")?.value;

		// neither cookie is set log in. if protected route.
		if (!refreshToken || !accessToken) {
			const response = NextResponse.redirect(new URL("/login", req.url));
			response.cookies.delete("accessToken");
			response.cookies.delete("refreshToken");
			return response;
		}

		// if this doesn't throw than we are good.
		// throws if token expired or invalid token
		const validToken = await validateToken(accessToken);

		// Optional: Add additional security checks
		if (!validToken) {
			throw new Error("Invalid token claims");
		}
		return NextResponse.next();
	} catch (err) {
		if (err instanceof JWTExpired) {
			const path = req.nextUrl.pathname;
			const redirectURL = new URL("/api/auth/refresh-token", req.url);
			redirectURL.searchParams.set("redirect", path);
			return NextResponse.redirect(redirectURL);
		}
		return NextResponse.redirect(new URL("/login", req.url));
	}
}

export const config = {
	matcher: "/dashboard/:path*",
};
