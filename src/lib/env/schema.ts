// src/lib/env/schema.ts
import { z } from "zod";

// server environment variables
export const serverSchema = z.object({
	ENCRYPTION_KEY: z.string().min(64).max(64),
	REFRESH_TOKEN_EXPIRY: z.string().min(1),
	DATABASE_URL: z.string().url(),
	WS_PORT: z.string().min(1),
	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	GOOGLE_REDIRECT_URI: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
});

// middleware accessible
export const edgeSchema = z.object({
	JWT_SECRET: z.string().min(32),
	JWT_EXPIRY: z.string().min(1),
	JWT_AUD: z.string().min(1),
	JWT_ISS: z.string().min(1),
});

// client. make sure to use NEXT_PUBLIC_ prefix
export const clientSchema = z.object({
	NEXT_PUBLIC_API_URL: z.string().url(),
	NEXT_PUBLIC_WS_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type EdgeEnv = z.infer<typeof edgeSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
