import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "name required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(5, "password must be at least 5 characters"),
});

// for type safety
export type SignupSchema = z.infer<typeof signupSchema>;
