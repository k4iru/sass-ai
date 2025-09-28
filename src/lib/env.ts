import { z } from "zod";

// TODO
const serverEnvSchema = z.object({
	ENCRYPTION_KEY: z.string().min(64).max(64),
});

const clientEnvSchema = z.object({
	NEXT_PUBLIC_API_URL: z.string(),
	NEXT_PUBLIC_WS_URL: z.string(),
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const clientEnv = clientEnvSchema.parse(process.env);
