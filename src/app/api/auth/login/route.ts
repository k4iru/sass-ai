export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getClientIP, getUserFromEmail, rateLimiter } from "@/lib/nextUtils";
import type { AuthUser } from "@/shared/lib/types";

// sets cookies + adds session id into session db.
export async function POST(req: NextRequest) {
	const ip = getClientIP(req);
	if (!rateLimiter(`login:${ip}`, 5, 60_000)) {
		return NextResponse.json(
			{ success: false, message: "Too many requests" },
			{ status: 429 },
		);
	}

	const { email, password } = await req.json();
	const user = await getUserFromEmail(email);

	// check user exists
	if (user === null || !user.password) {
		return NextResponse.json(
			{ success: false, message: "Invalid email or password" },
			{ status: 401 },
		);
	}

	const authUser: AuthUser = {
		id: user.id,
		emailVerified: user.emailVerified,
	};
	// check password matches
	const valid = verifyPassword(password, user.password);
	if (!valid)
		return NextResponse.json(
			{ success: false, message: "Invalid email or password" },
			{ status: 401 },
		);

	const res = NextResponse.json({ success: true, userObj: authUser });
	await createSession(res, req, user.id);
	return res;
}
