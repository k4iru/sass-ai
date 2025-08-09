import { z } from "zod";

export const signupSchema = z.object({
	first: z.string().min(1, "first name required"),
	last: z.string().min(1, "last name required"),
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(5, "password must be at least 5 characters")
		.regex(/\d/, "password must contain at least one number"),
});

// for type safety
export type SignupSchema = z.infer<typeof signupSchema>;
