import jwt from "jsonwebtoken";

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// Generate access token
export function generateAccessToken(user: { email: string }) {
  return jwt.sign({ iss: "https://sass-ai", aud: "https://sass-ai", sub: `email=${user.email}` }, `${JWT_SECRET}`, { expiresIn: JWT_EXPIRY });
}

// Generate refresh token
export function generateRefreshToken(user: { id: number }) {
  return jwt.sign({ id: user.id }, `${JWT_SECRET}`, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Verify token
export function verifyToken(token: string) {
  return jwt.verify(token, `${JWT_SECRET}`);
}
