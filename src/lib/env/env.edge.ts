// import { logger } from "@/lib/logger";
import { type EdgeEnv, edgeSchema } from "./schema";

// This variable persists as long as the Edge function instance is "warm"
let cachedEdgeEnv: EdgeEnv | undefined;

export const getEdgeEnv = (): EdgeEnv => {
	// 1. Return cached version if it exists
	if (cachedEdgeEnv) {
		return cachedEdgeEnv;
	}

	const parsed = edgeSchema.safeParse({
		JWT_AUD: process.env.JWT_AUD,
		JWT_ISS: process.env.JWT_ISS,
		JWT_EXPIRY: process.env.JWT_EXPIRY,
		JWT_SECRET: process.env.JWT_SECRET,
	});

	if (!parsed.success) {
		// 2. Log exactly what failed so you aren't guessing
		console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
		throw new Error("Invalid edge environment");
	}

	// 3. Store the result before returning
	cachedEdgeEnv = parsed.data;
	return cachedEdgeEnv;
};
