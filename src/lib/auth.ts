"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { validateToken } from "./jwt";
import { getRefreshToken } from "./helper";
import { type NextRequest } from "next/server";

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

export async function authenticate(req: NextRequest): Promise<void> {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get("accessToken")?.value;
	const refreshToken = cookieStore.get("refreshToken")?.value;

	if (!accessToken || !refreshToken) throw new Error("Unauthorized");

	try {
		const verified = await validateToken(accessToken);
		// add additional verification for checking refresh token. since this allows anyone with any access token to run.

		const refreshTokenExists = getRefreshToken(refreshToken);

		if (!verified || !refreshTokenExists) throw new Error("Unauthorized");
	} catch (err) {
		console.log(err);
	}
}
