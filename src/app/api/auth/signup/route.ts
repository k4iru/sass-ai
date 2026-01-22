export const runtime = "nodejs"; // Use the full server power

import { type NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword, sendValidationEmail } from "@/lib/auth";
import {
	generateRandomAccessCode,
	insertUser,
	isExistingUser,
} from "@/lib/nextUtils";
import { signupSchema } from "@/lib/validation/signupSchema";
import type { AuthUser, SignupRequestBody } from "@/shared/lib/types";

export async function POST(req: NextRequest) {
	try {
		const body: SignupRequestBody = await req.json();

		// server side validation
		// ensure all values are valid
		const validationResult = signupSchema.safeParse(body);
		if (!validationResult.success) {
			const errors = validationResult.error.errors
				.map((err) => err.message)
				.join(", ");
			return NextResponse.json({ success: false, message: errors });
		}

		// check if user is already in db
		if (await isExistingUser(body.email))
			return NextResponse.json({
				success: false,
				message: "User already exists",
			});

		// hash password
		const hashedPassword = await hashPassword(body.password);
		const accessCode = generateRandomAccessCode();

		const user = await insertUser(
			body.first,
			body.last,
			body.email,
			hashedPassword,
			"email",
		);

		// TODO set refresh id, access token and redirect to dashboard.
		if (!user) {
			throw new Error("Failed to insert user into the database");
		}

		// data transfer object, so we don't send full user object back over internet
		const authUser: AuthUser = {
			id: user.id,
			emailVerified: user.emailVerified,
		};

		await sendValidationEmail(user.id, body.email, accessCode);
		console.log("sent validation email to user", body.email);

		const res = NextResponse.json({ success: true, user: authUser });
		await createSession(res, req, user.id);
		return res;

		// set access token / refresh token in cookies. redirect to dashboard.
	} catch (err) {
		// gracefully exit;
		console.error(
			`Error: ${err instanceof Error ? err.message : "unknown error"}`,
		);
		return NextResponse.json({ success: false, message: "Can't sign up" });
	}
}
