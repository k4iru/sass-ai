"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { edgeEnv } from "@/lib/env/env.edge";
import { serverEnv } from "@/lib/env/env.server";
import {
	deleteAccessCode,
	generateRefreshToken,
	getClientIP,
	getRefreshToken,
	insertAccessCode,
	insertRefreshToken,
	rateLimiter,
} from "@/lib/helper";
import { generateAccessToken, getJwtConfig, validateToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";

const resend = new Resend(serverEnv.RESEND_API_KEY);

// Hash password
export async function hashPassword(password: string): Promise<string> {
	try {
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		// salt is included in the hashed password so no need to store separately
		return hashedPassword;
	} catch (err) {
		throw new Error(
			`Error hashing password: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
	}
}

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

// TODO: currently in testing.
// swap to send to actual user email once verified.
export async function sendValidationEmail(
	userId: string,
	recipient: string,
	accessCode: string,
): Promise<boolean> {
	try {
		if (!userId || !recipient || !accessCode)
			throw new Error("Invalid parameters for sending validation email");

		// delete existing access code if it exists
		await deleteAccessCode(userId, "email");

		// create new access code
		const accessCodeInserted = await insertAccessCode(
			userId,
			accessCode,
			"email",
		);

		if (!accessCodeInserted) {
			throw new Error("Failed to insert access code into the database");
		}

		logger.info(`Access code inserted for user ${userId}`);

		// TODO: change to user email when verified.
		// once domain is bought swap to official email, using subdomain for now.
		// also work on styling email later
		resend.emails.send({
			from: "Keppel <verification@noreply.kylecheung.ca>",
			to:
				process.env.NODE_ENV === "production"
					? recipient
					: "devbykylecheung@gmail.com",
			subject: "Verify your email",
			html: `<p>Thank you for signing up. Use the access code to verify your email.</p> <p>Access code: <strong>${accessCode}</strong></p>`,
		});
		return true;
	} catch (error) {
		logger.error(
			`Failed to send validation email: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

// currently only checking using ip address for meta data
// change to also use user agent etc later on for better security
export async function createSession(
	res: NextResponse,
	req: NextRequest,
	userId: string,
): Promise<{
	accessToken: string;
	refreshToken: string;
}> {
	const ip = getClientIP(req);
	const accessToken = await generateAccessToken({ id: userId });
	const refreshToken = await generateRefreshToken();

	const JWT_EXPIRY = parseInt(edgeEnv.JWT_EXPIRY);
	const REFRESH_TOKEN_EXPIRY = parseInt(serverEnv.REFRESH_TOKEN_EXPIRY);

	const result = await insertRefreshToken(
		refreshToken,
		userId,
		accessToken,
		ip,
	);

	if (!result) throw new Error("Failed to insert refresh token");

	res.cookies.set({
		name: "accessToken",
		value: accessToken,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: JWT_EXPIRY,
	});

	res.cookies.set({
		name: "refreshToken",
		value: refreshToken,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: REFRESH_TOKEN_EXPIRY,
	});

	logger.info(`Created session for user ${userId} from IP ${ip}`);
	return { accessToken, refreshToken };
}

// this is used to authenticate server side requests
// middleware has a refresh-tokens endpoint run client side which should ensure that users have both valid access and refresh tokens
export async function authenticate(userId: string): Promise<void> {
	// 10 requests per 30 seconds
	// this works for single server instance deployments for scaling think about using redis later
	if (!rateLimiter(userId, 10, 30 * 1000)) {
		throw new Error("Too many authentication attempts. Try again later.");
	}

	const { JWT_AUD, JWT_ISS } = getJwtConfig();

	const cookieStore = await cookies();
	const accessToken = cookieStore.get("accessToken")?.value;
	const refreshTokenId = cookieStore.get("refreshToken")?.value;

	if (!accessToken || !refreshTokenId) throw new Error("malformed tokens");

	try {
		// cross validate tokens
		const refreshToken = await getRefreshToken(refreshTokenId);
		if (
			!refreshToken ||
			refreshToken.userId !== userId ||
			refreshToken.accessToken !== accessToken
		)
			throw new Error("invalid refresh token");

		const payload = await validateToken(accessToken);
		if (
			!payload ||
			payload.aud !== JWT_AUD ||
			payload.iss !== JWT_ISS ||
			payload.sub !== userId
		)
			throw new Error("invalid access token");
	} catch (err) {
		logger.error(
			`Authentication failed for ${userId}: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		throw new Error(
			`Unauthorized, ${err instanceof Error ? err.message : "Unknown error"}`,
		);
	}
}

export async function getGoogleOAuthURL() {
	const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
	const options = {
		redirect_uri: serverEnv.GOOGLE_REDIRECT_URI,
		client_id: serverEnv.GOOGLE_CLIENT_ID,
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
