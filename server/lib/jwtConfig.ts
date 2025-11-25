import { z } from "zod";
import type { JwtConfig } from "@/shared/lib/types";

const serverSchema = z.object({
	JWT_SECRET: z.string().min(32),
	JWT_EXPIRY: z.string().min(1),
	JWT_AUD: z.string().min(1),
	JWT_ISS: z.string().min(1),
});

const parsed = serverSchema.safeParse({
	JWT_AUD: process.env.JWT_AUD,
	JWT_ISS: process.env.JWT_ISS,
	JWT_EXPIRY: process.env.JWT_EXPIRY,
	JWT_SECRET: process.env.JWT_SECRET,
});

if (!parsed.success) {
	//logger.error("Invalid edge environment variables");
	throw new Error("Invalid edge environment");
}
export const serverEnv = parsed.data;

export const getJwtConfig = (): JwtConfig => {
	const JWT_SECRET = serverEnv.JWT_SECRET;
	const JWT_EXPIRY = serverEnv.JWT_EXPIRY;
	const JWT_AUD = serverEnv.JWT_AUD;
	const JWT_ISS = serverEnv.JWT_ISS;

	if (!JWT_SECRET || !JWT_EXPIRY || !JWT_AUD || !JWT_ISS) {
		throw new Error(
			"JWT configuration is not properly set in environment variables",
		);
	}

	return { JWT_SECRET, JWT_EXPIRY, JWT_AUD, JWT_ISS };
};
