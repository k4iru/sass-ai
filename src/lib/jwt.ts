import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from "jose";

// Type definitions for JWT payload
interface CustomJwtPayload extends JWTPayload {
	sub: string;
	iss: string;
	aud: string;
	jti: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const JWT_AUD = process.env.JWT_AUD || "";
const JWT_ISS = process.env.JWT_ISS || "";

const getJwtSecret = () => new TextEncoder().encode(JWT_SECRET);

// Generate access token
export async function generateAccessToken(user: {
	id: string;
}): Promise<string> {
	return new SignJWT({
		iss: JWT_ISS,
		aud: JWT_AUD,
		sub: user.id,
		jti: `${crypto.randomUUID()}`, // Edge-compatible
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${JWT_EXPIRY}`)
		.sign(getJwtSecret());
}

// Verify token with proper typing
export async function verifyToken(token: string): Promise<CustomJwtPayload> {}

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

export const validateToken = async (accessToken?: string): Promise<boolean> => {
	if (!accessToken) return false;

	const { payload } = await jwtVerify<CustomJwtPayload>(
		accessToken,
		getJwtSecret(),
	);

	if (payload.aud !== JWT_AUD || payload.iss !== JWT_ISS) return false;
	return true;
};
