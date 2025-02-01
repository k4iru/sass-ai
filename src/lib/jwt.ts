import * as jwt from "jsonwebtoken";

declare module "jsonwebtoken" {
  export interface extendedPayload extends jwt.JwtPayload {
    sub: string;
  }
}

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;

// Generate access token
export async function generateAccessToken(user: { id: string }): Promise<string> {
  console.log(user);
  return jwt.sign({ iss: "https://sass-ai", aud: "https://sass-ai", sub: user.id, jti: crypto.randomUUID() }, `${JWT_SECRET}`, { expiresIn: JWT_EXPIRY });
}

// Verify token
export function verifyToken(token: string) {
  return jwt.verify(token, `${JWT_SECRET}`);
}

export function getUserSubFromJWT(token: string): string | null {
  try {
    const decoded = <jwt.extendedPayload>jwt.decode(token);
    if (decoded === null || decoded === undefined) throw new Error("invalid token");
    if (decoded.sub === null || decoded.sub === undefined) throw new Error("malformed token");

    return decoded.sub;
  } catch (err) {
    console.log("Invalid token: " + (err instanceof Error ? err.message : "Unknown error"));
    return null;
  }
}
