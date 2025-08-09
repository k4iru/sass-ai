"use server";
import { type NextRequest, NextResponse } from "next/server";

import { generateAccessToken } from "@/lib/jwt";
import {
	generateRefreshToken,
	getUserFromEmail,
	timeStringToSeconds,
} from "@/lib/helper";
import { hashPassword } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { db, schema } from "@/db";

const JWT_EXPIRY = timeStringToSeconds(process.env.JWT_EXPIRY || "60m");
const REFRESH_TOKEN_EXPIRY = timeStringToSeconds(
	process.env.REFRESH_TOKEN_EXPIRY || "7d",
);

// sets cookies + adds session id into session db.
export async function GET(req: NextRequest) {
	if (
		process.env.GOOGLE_CLIENT_ID === undefined ||
		process.env.GOOGLE_CLIENT_SECRET === undefined ||
		process.env.GOOGLE_REDIRECT_URI === undefined
	) {
		return NextResponse.json({ error: "broken config" }, { status: 400 });
	}

	// grab params
	const url = new URL(req.url);
	const code = url.searchParams.get("code");

	if (!code) {
		return NextResponse.json({ error: "No code provided" }, { status: 400 });
	}

	// Exchange code for tokens
	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: process.env.GOOGLE_CLIENT_ID,
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
			redirect_uri: process.env.GOOGLE_REDIRECT_URI,
			grant_type: "authorization_code",
		}),
	});

	const tokenData = await tokenRes.json();
	if (!tokenRes.ok) {
		console.error("Token error:", tokenData);
		return NextResponse.json(
			{ error: "Failed to exchange token" },
			{ status: 500 },
		);
	}

	const googleAccessToken = tokenData.access_token;

	const peopleRes = await fetch(
		"https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos",
		{
			headers: {
				Authorization: `Bearer ${googleAccessToken}`,
			},
		},
	);

	if (peopleRes.status !== 200) {
		return NextResponse.json(
			{ error: "couldn't authenticate user" },
			{ status: 400 },
		);
	}

	const profile = await peopleRes.json();

	console.log(profile);

	// ensure email is verified
	if (!profile.emailAddresses?.[0]?.metadata?.verified) {
		return NextResponse.json(
			{ error: "Google account email not verified" },
			{ status: 400 },
		);
	}

	// Extract useful info
	const user = {
		first: profile.names?.[0]?.givenName ?? "Unknown",
		last: profile.names?.[0]?.familyName ?? "Unknown",
		email: profile.emailAddresses?.[0]?.value ?? "Unknown",
	};

	let userObj = await getUserFromEmail(user.email);
	if (userObj == null) {
		// create new user
		console.log("Creating new user");

		// random string for password
		const hashedPassword = await hashPassword(uuid().toString());

		// prep new user to insert into db
		const insertUser: typeof schema.usersTable.$inferInsert = {
			first: user.first,
			last: user.last,
			email: user.email,
			emailVerified: true,
			password: hashedPassword,
		};

		// insert into db
		const result = await db.insert(schema.usersTable).values(insertUser);

		if (!result) {
			return NextResponse.json(
				{ error: "couldn't add user to database" },
				{ status: 400 },
			);
		}
		userObj = await getUserFromEmail(user.email);
	}

	if (!userObj) {
		return NextResponse.json(
			{ error: "couldn't grab user obj" },
			{ status: 400 },
		);
	}

	// TODO: Save to DB, create session, etc.

	const accessToken = await generateAccessToken({ id: userObj.id });
	const refreshToken = await generateRefreshToken();

	const res = NextResponse.redirect(new URL("/chat", req.url));

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

	// do stuff with profile. Either log in or create new user.
}
