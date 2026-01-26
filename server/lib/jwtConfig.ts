import { getEdgeEnv } from "@/lib/env/env.edge";
import type { JwtConfig } from "@/shared/lib/types";

export const getJwtConfig = (): JwtConfig => {
	const edgeEnv = getEdgeEnv();

	const JWT_SECRET = edgeEnv.JWT_SECRET;
	const JWT_EXPIRY = edgeEnv.JWT_EXPIRY;
	const JWT_AUD = edgeEnv.JWT_AUD;
	const JWT_ISS = edgeEnv.JWT_ISS;

	if (!JWT_SECRET || !JWT_EXPIRY || !JWT_AUD || !JWT_ISS) {
		throw new Error(
			"JWT configuration is not properly set in environment variables",
		);
	}

	return { JWT_SECRET, JWT_EXPIRY, JWT_AUD, JWT_ISS };
};
