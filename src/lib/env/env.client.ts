import { logger } from "@/lib/logger";
import { clientSchema } from "./schema";

const parsed = clientSchema.safeParse({
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
});

if (!parsed.success) {
	logger.error("Invalid client environment variables:");
	throw new Error("Invalid client environment variables");
}

export const clientEnv = parsed.data;
