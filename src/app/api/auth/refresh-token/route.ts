import { type NextRequest, NextResponse } from "next/server";
import {
	deleteRefreshToken,
	generateRefreshToken,
	getClientIP,
	getRefreshToken,
	insertRefreshToken,
} from "@/lib/nextUtils";
import { generateAccessToken, getUserSubFromJWT } from "@/shared/lib/jwt";
import { logger } from "@/shared/logger";

const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || "900");
const REFRESH_TOKEN_EXPIRY = parseInt(
	process.env.REFRESH_TOKEN_EXPIRY || "604800",
);

// TODO move session management to redis for speed
export async function POST(req: NextRequest) {
	try {
		if (Number.isNaN(JWT_EXPIRY) || Number.isNaN(REFRESH_TOKEN_EXPIRY))
			throw new Error("Invalid token expiration configuration");

		// grab current refresh token
		const refreshToken = req.cookies.get("refreshToken")?.value;
		const accessToken = req.cookies.get("accessToken")?.value;
		const redirectPath =
			req.nextUrl.searchParams.get("redirect") || "/dashboard";
		const clientIP = getClientIP(req);

		if (!refreshToken || !accessToken) {
			throw new Error("invalid token");
		}

		const userId = getUserSubFromJWT(accessToken);
		if (userId === null || userId === "")
			throw new Error("cant get user from token");

		// before generating new tokens validate that old refresh token is valid.
		const query = await getRefreshToken(refreshToken);

		if (
			!query ||
			query.accessToken !== accessToken ||
			query.userId !== userId ||
			query.ipAddress !== clientIP ||
			new Date(query.expiryDate) < new Date()
		) {
			logger.error("Refresh token validation failed", {
				refreshToken,
				accessToken,
				clientIP,
			});
			throw new Error("invalid token");
		}

		// create new tokens
		const [newAccessToken, newRefreshToken] = await Promise.all([
			generateAccessToken({ id: userId }),
			generateRefreshToken(),
		]);

		// delete old tokens, insert new ones
		const [deleteResult, insertResult] = await Promise.all([
			deleteRefreshToken(refreshToken),
			insertRefreshToken(newRefreshToken, userId, newAccessToken, clientIP),
		]);
		if (!deleteResult || !insertResult) {
			throw new Error("database error");
		}

		const res = NextResponse.redirect(new URL(redirectPath, req.url));
		// Access token cookie
		res.cookies.set({
			name: "accessToken",
			value: newAccessToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax", // More compatible than strict
			path: "/",
			maxAge: JWT_EXPIRY, // 15 minutes (matches access token expiry)
		});

		// Refresh token cookie
		res.cookies.set({
			name: "refreshToken",
			value: newRefreshToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: REFRESH_TOKEN_EXPIRY, // 7 days (matches refresh token expiry)
		});

		return res;
	} catch (err) {
		console.error("token refresh failed", err);
		const response = NextResponse.redirect(new URL("/login", req.url));
		response.cookies.delete("accessToken");
		response.cookies.delete("refreshToken");

		return response;
	}
}
