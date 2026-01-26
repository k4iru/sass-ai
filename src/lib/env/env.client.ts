import { logger } from "@/shared/logger";
import { type ClientEnv, clientSchema } from "./schema";

let cachedClientEnv: ClientEnv | undefined;

export const getClientEnv = (): ClientEnv => {
	if (cachedClientEnv) return cachedClientEnv;

	const parsed = clientSchema.safeParse({
		NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
		NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
	});

	if (!parsed.success) {
		// Better logging to catch which URL is malformed
		logger.error(parsed.error.flatten().fieldErrors);
		throw new Error("Invalid client environment variables");
	}

	cachedClientEnv = parsed.data;
	return cachedClientEnv;
};
