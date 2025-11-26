import { logger } from "@/shared/logger";
import { serverSchema } from "./schema";

const parsed = serverSchema.safeParse({
	JWT_SECRET: process.env.JWT_SECRET,
	ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
	JWT_EXPIRY: process.env.JWT_EXPIRY,
	REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
	DATABASE_URL: process.env.DATABASE_URL,
	AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	AWS_REGION: process.env.AWS_REGION,
	AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
	PINECONE_API_KEY: process.env.PINECONE_API_KEY,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	WS_PORT: process.env.WS_PORT,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
	RESEND_API_KEY: process.env.RESEND_API_KEY,
});

if (!parsed.success) {
	logger.error("Invalid server environment variables:");
	logger.error(parsed.error.format());
	throw new Error("Invalid server environment variables");
}

export const serverEnv = parsed.data;
