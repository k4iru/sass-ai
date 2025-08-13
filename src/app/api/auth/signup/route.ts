import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { db, schema } from "@/db";
import { hashPassword } from "@/lib/auth";
import {
	generateRandomAccessCode,
	isExistingUser,
	response,
} from "@/lib/helper";
import { signupSchema } from "@/lib/validation/signupSchema";

interface SignupRequestBody {
	first: string;
	last: string;
	email: string;
	password: string;
}

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

		// prep new user to insert into db
		const user: typeof schema.usersTable.$inferInsert = {
			first: body.first,
			last: body.last,
			email: body.email,
			password: hashedPassword,
		};

		// insert into db // move this into a helper function later.
		const result = await db.insert(schema.usersTable).values(user);

		// TODO set refresh id, access token and redirect to dashboard.
		if (!result) {
			throw new Error("Failed to insert user into the database");
		}

		// send validation email
		const resend = new Resend(process.env.RESEND_API_KEY);

		const accessCode = generateRandomAccessCode();

		resend.emails.send({
			from: "Keppel <verification@noreply.kylecheung.ca>",
			to: "devbykylecheung@gmail.com",
			subject: "Verify your email",
			html: `<p>Thank you for signing up. Use the access code to verify your email.</p> <p>Access code: <strong>${accessCode}</strong></p>`,
		});
	} catch (err) {
		// gracefully exit;
		console.error(
			`Error: ${err instanceof Error ? err.message : "unknown error"}`,
		);
		return response(false, "Internal server error", 500);
	}

	return response(true, "Form submitted successfully!", 200);
}
