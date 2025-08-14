"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
	deleteAccessCode,
	generateRefreshToken,
	getClientIP,
	getRefreshToken,
	insertAccessCode,
	insertRefreshToken,
	timeStringToSeconds,
} from "@/lib/helper";
import { generateAccessToken, validateToken } from "./jwt";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
	throw new Error("RESEND_API_KEY is not defined in the environment variables");
}

const resend = new Resend(RESEND_API_KEY);

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

		resend.emails.send({
			from: "Keppel <verification@noreply.kylecheung.ca>",
			to: recipient,
			subject: "Verify your email",
			html: `<p>Thank you for signing up. Use the access code to verify your email.</p> <p>Access code: <strong>${accessCode}</strong></p>`,
		});
		return true;
	} catch (error) {
		console.error("Failed to send validation email:", error);
		return false;
	}
}

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

	const JWT_EXPIRY = timeStringToSeconds(process.env.JWT_EXPIRY || "60m");
	const REFRESH_TOKEN_EXPIRY = timeStringToSeconds(
		process.env.REFRESH_TOKEN_EXPIRY || "7d",
	);

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
		sameSite: "strict",
		path: "/",
		maxAge: JWT_EXPIRY,
	});

	res.cookies.set({
		name: "refreshToken",
		value: refreshToken,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		maxAge: REFRESH_TOKEN_EXPIRY,
	});

	return { accessToken, refreshToken };
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
