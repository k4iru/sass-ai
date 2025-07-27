import type { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { db, schema } from "@/db";
import { signupSchema } from "@/lib/validation/signupSchema";
import { response, isExistingUser } from "@/lib/helper";

interface SignupRequestBody {
	name: string;
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
			name: body.name,
			email: body.email,
			password: hashedPassword,
		};

		// insert into db
		const result = await db.insert(schema.usersTable).values(user);

		// TODO set refresh id, access token and redirect to dashboard.
		if (!result) {
			throw new Error("Failed to insert user into the database");
		}
	} catch (err) {
		// gracefully exit;
		console.error(
			`Error: ${err instanceof Error ? err.message : "unknown error"}`,
		);
		return response(false, "Internal server error", 500);
	}

	return response(true, "Form submitted successfully!", 200);
}
