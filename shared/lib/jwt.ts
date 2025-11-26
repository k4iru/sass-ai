import { decodeJwt, type JWTPayload, jwtVerify, SignJWT } from "jose";
import type { JwtConfig } from "@/shared/lib/types";

// Type definitions for JWT payload
interface CustomJwtPayload extends JWTPayload {
	sub: string;
	iss: string;
	aud: string;
	jti: string;
}
const getJwtSecret = (config: JwtConfig) => {
	if (!config) throw new Error("JWT config is required");
	const { JWT_SECRET } = config;
	return new TextEncoder().encode(JWT_SECRET);
};
// Generate access token
export async function generateAccessToken(
	user: {
		id: string;
	},
	config: JwtConfig,
): Promise<string> {
	if (!config) throw new Error("JWT config is required");

	const { JWT_EXPIRY, JWT_AUD, JWT_ISS } = config;
	return new SignJWT({
		iss: JWT_ISS,
		aud: JWT_AUD,
		sub: user.id,
		jti: `${crypto.randomUUID()}`, // Edge-compatible
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${JWT_EXPIRY}s`)
		.sign(getJwtSecret(config));
}

export function getUserSubFromJWT(
	token: string,
	config: JwtConfig,
): string | null {
	try {
		if (!config) throw new Error("JWT config is required");

		const decoded = decodeJwt(token) as CustomJwtPayload;

		if (!decoded?.sub) {
			throw new Error("Malformed token - missing subject");
		}

		return decoded.sub;
	} catch (err) {
		console.error(
			"Token decoding failed:",
			err instanceof Error ? err.message : "Unknown error",
		);
		return null;
	}
}

export const validateToken = async (
	config: JwtConfig,
	accessToken: string,
): Promise<JWTPayload | null> => {
	if (!config) throw new Error("JWT config is required");
	if (!accessToken) return null;

	const { payload } = await jwtVerify<JWTPayload>(
		accessToken,
		getJwtSecret(config),
	);

	return payload;
};
