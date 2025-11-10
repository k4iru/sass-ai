import { logger } from "@/lib/logger";
import { edgeSchema } from "./schema";

const parsed = edgeSchema.safeParse({
	JWT_AUD: process.env.JWT_AUD,
	JWT_ISS: process.env.JWT_ISS,
	JWT_EXPIRY: process.env.JWT_EXPIRY,
	JWT_SECRET: process.env.JWT_SECRET,
});

if (!parsed.success) {
	logger.error("Invalid edge environment variables");
	throw new Error("Invalid edge environment");
}

export const edgeEnv = parsed.data;
