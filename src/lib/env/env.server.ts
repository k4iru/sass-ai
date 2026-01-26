import { logger } from "@/shared/logger";
import { type ServerEnv, serverSchema } from "./schema";

let cachedEnv: ServerEnv | undefined;

export const getServerEnv = (): ServerEnv => {
	// If we've already validated, just return the data
	if (cachedEnv) return cachedEnv;

	const parsed = serverSchema.safeParse({
		ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
		REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
		DATABASE_URL: process.env.DATABASE_URL,
		WS_PORT: process.env.WS_PORT,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
	});

	if (!parsed.success) {
		// flatten() is often easier to read in logs than format()
		logger.error(parsed.error.flatten().fieldErrors);
		throw new Error("Invalid server environment variables");
	}

	cachedEnv = parsed.data;
	return cachedEnv;
};
