import * as jwt from "jsonwebtoken";

declare module "jsonwebtoken" {
  export interface extendedPayload extends jwt.JwtPayload {
    sub: string;
  }
}

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// Generate access token
export function generateAccessToken(user: { sub: string }): string {
  console.log(user);
  return jwt.sign({ iss: "https://sass-ai", aud: "https://sass-ai", sub: user.sub }, `${JWT_SECRET}`, { expiresIn: JWT_EXPIRY });
}

// Generate refresh token
export function generateRefreshToken(user: { sub: string }): string {
  return jwt.sign({ sub: user.sub }, `${JWT_SECRET}`, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Verify token
export function verifyToken(token: string) {
  return jwt.verify(token, `${JWT_SECRET}`);
}

export function getUserSubFromJWT(token: string): string | null {
  console.log("inside get user sub from jwt");

  console.log(token);
  try {
    const decoded = <jwt.extendedPayload>jwt.decode(token);
    if (decoded === null) throw new Error("invalid token");
    console.log(decoded);
    console.log(decoded.sub);

    console.log("exit get sub from jwt");
    return decoded.sub;
  } catch (err) {
    console.log("Invalid token: " + (err instanceof Error ? err.message : "Unknown error"));
    return null;
  }
}
