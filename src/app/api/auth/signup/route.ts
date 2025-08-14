import type { NextRequest } from "next/server";
import { hashPassword, sendValidationEmail } from "@/lib/auth";
import {
	generateRandomAccessCode,
	insertUser,
	isExistingUser,
	response,
} from "@/lib/helper";
import type { SignupRequestBody } from "@/lib/types";
import { signupSchema } from "@/lib/validation/signupSchema";

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
			return response(false, errors, 400);
		}

		// check if user is already in db
		if (await isExistingUser(body.email))
			return response(false, "User already exists", 409);

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

		await sendValidationEmail(user.id, body.email, accessCode);

		// set access token / refresh token in cookies. redirect to dashboard.
	} catch (err) {
		// gracefully exit;
		console.error(
			`Error: ${err instanceof Error ? err.message : "unknown error"}`,
		);
		return response(false, "Internal server error", 500);
	}

	return response(true, "Form submitted successfully!", 200);
}
