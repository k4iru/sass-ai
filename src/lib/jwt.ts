import * as jwt from "jsonwebtoken";

declare module "jsonwebtoken" {
  export interface extendedPayload extends jwt.JwtPayload {
    email: string;
  }
}

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// Generate access token
export function generateAccessToken(user: { email: string }): string {
  return jwt.sign({ iss: "https://sass-ai", aud: "https://sass-ai", email: user.email }, `${JWT_SECRET}`, { expiresIn: JWT_EXPIRY });
}

// Generate refresh token
export function generateRefreshToken(user: { email: string }): string {
  return jwt.sign({ email: user.email }, `${JWT_SECRET}`, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Verify token
export function verifyToken(token: string) {
  return jwt.verify(token, `${JWT_SECRET}`);
}

export function getUserEmailFromJWT(token: string): string | null {
  try {
    const decoded = <jwt.extendedPayload>jwt.decode(token);
    if (decoded === null) throw new Error("invalid token");
    return decoded.email;
  } catch (err) {
    console.log("Invalid token: " + (err instanceof Error ? err.message : "Unknown error"));
    return null;
  }
}
