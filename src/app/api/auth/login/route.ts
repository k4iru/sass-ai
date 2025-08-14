"use server";
import { type NextRequest, NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getUserFromEmail, response } from "@/lib/helper";

// sets cookies + adds session id into session db.
export async function POST(req: NextRequest) {
	const { email, password } = await req.json();
	const user = await getUserFromEmail(email);

	// check user exists
	if (user === null || !user.password) {
		return response(false, "Invalid email or password", 401);
	}

	// check password matches
	const valid = verifyPassword(password, user.password);
	if (!valid) return response(false, "Invalid email or password", 401);

	const res = NextResponse.json({ success: true, user: user });
	await createSession(res, req, user.id);
	return res;
}
