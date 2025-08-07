"use server";
import { type NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import {
	getUserFromEmail,
	insertRefreshToken,
	generateRefreshToken,
	response,
	getClientIP,
} from "@/lib/helper";
import { generateAccessToken } from "@/lib/jwt";
import { timeStringToSeconds } from "@/lib/helper";

const JWT_EXPIRY = timeStringToSeconds(process.env.JWT_EXPIRY || "60m");
const REFRESH_TOKEN_EXPIRY = timeStringToSeconds(
	process.env.REFRESH_TOKEN_EXPIRY || "7d",
);

// sets cookies + adds session id into session db.
export async function POST(req: NextRequest) {
	const ip = getClientIP(req);
	const { email, password } = await req.json();
	const user = await getUserFromEmail(email);

	// check user exists
	if (user === null) {
		return response(false, "Invalid email or password", 401);
	}

	// check password matches
	const valid = verifyPassword(password, user.password);
	if (!valid) return response(false, "Invalid email or password", 401);

	// Authenticated! create tokens and send
	// TODO more validation. these refresh token functions don't throw an error on fail
	const accessToken = await generateAccessToken({ id: user.id });
	const refreshToken = await generateRefreshToken();

	const result = await insertRefreshToken(
		refreshToken,
		user.id,
		accessToken,
		ip,
	);

	if (!result) throw new Error("error logging in");

	const userObj = await getUserFromEmail(email);
	if (userObj == null) throw new Error("error logging in");

	const res = NextResponse.json({ success: true, user: userObj });
	// Access token cookie
	res.cookies.set({
		name: "accessToken",
		value: accessToken,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // More compatible than strict
		path: "/",
		maxAge: JWT_EXPIRY, // 15 minutes (matches access token expiry)
	});

	// Refresh token cookie
	res.cookies.set({
		name: "refreshToken",
		value: refreshToken,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		maxAge: REFRESH_TOKEN_EXPIRY, // 7 days (matches refresh token expiry)
	});

	return res;
}
