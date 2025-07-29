"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { validateToken } from "./jwt";
import { getRefreshToken } from "./helper";
import { config } from "dotenv";

// Hash password
export async function hashPassword(password: string): Promise<string> {
	try {
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		return hashedPassword;
	} catch (err) {
		throw new Error(
			`Error hashing password: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
	}
}

// Compare password
export async function verifyPassword(
	password: string,
	hashedPassword: string,
): Promise<boolean> {
	try {
		const isMatch = await bcrypt.compare(password, hashedPassword);
		return isMatch;
	} catch (err) {
		throw new Error(
			`Error comparing password: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
	}
}

export async function authenticate(): Promise<void> {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get("accessToken")?.value;
	const refreshToken = cookieStore.get("refreshToken")?.value;

	if (!accessToken || !refreshToken) throw new Error("Unauthorized");

	try {
		const verified = await validateToken(accessToken);
		// add additional verification for checking refresh token. since this allows anyone with any access token to run.

		const refreshTokenExists = await getRefreshToken(refreshToken);

		if (!verified || !refreshTokenExists) throw new Error("Unauthorized");
	} catch (err) {
		console.log(err);
		throw new Error("Unauthorized");
	}
}

export async function getGoogleOAuthURL() {
	if (
		process.env.GOOGLE_REDIRECT_URI === undefined ||
		process.env.GOOGLE_CLIENT_ID === undefined
	)
		throw new Error("invalid env config");
	const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
	const options = {
		redirect_uri: process.env.GOOGLE_REDIRECT_URI,
		client_id: process.env.GOOGLE_CLIENT_ID,
		access_type: "offline",
		response_type: "code",
		prompt: "consent",
		scope: [
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		].join(" "),
	};

	const params = new URLSearchParams(options);
	return `${rootUrl}?${params.toString()}`;
}
