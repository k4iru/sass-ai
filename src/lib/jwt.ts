import { decodeJwt, type JWTPayload, jwtVerify, SignJWT } from "jose";
import { edgeEnv } from "@/lib/env/env.edge";

// Type definitions for JWT payload
interface CustomJwtPayload extends JWTPayload {
	sub: string;
	iss: string;
	aud: string;
	jti: string;
}

export const getJwtConfig = () => {
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

const getJwtSecret = () => {
	const { JWT_SECRET } = getJwtConfig();
	return new TextEncoder().encode(JWT_SECRET);
};
// Generate access token
export async function generateAccessToken(user: {
	id: string;
}): Promise<string> {
	const { JWT_EXPIRY, JWT_AUD, JWT_ISS } = getJwtConfig();
	return new SignJWT({
		iss: JWT_ISS,
		aud: JWT_AUD,
		sub: user.id,
		jti: `${crypto.randomUUID()}`, // Edge-compatible
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${JWT_EXPIRY}s`)
		.sign(getJwtSecret());
}

export function getUserSubFromJWT(token: string): string | null {
	try {
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
	accessToken?: string,
): Promise<JWTPayload | null> => {
	if (!accessToken) return null;

	const { payload } = await jwtVerify<JWTPayload>(accessToken, getJwtSecret());

	return payload;
};
