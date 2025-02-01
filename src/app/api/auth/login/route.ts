"use server";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { generateAccessToken } from "@/lib/jwt";
import { getUserFromEmail, insertRefreshToken, generateRefreshToken, response } from "@/lib/helper";
import { db, schema } from "@/db";

const JWT_EXPIRY = process.env.JWT_EXPIRY || "";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "";

// TODO error checking, refactor, robustness
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || // Cloudflare/Proxy support
    req.headers.get("x-real-ip") || // Nginx support
    req.headers.get("cf-connecting-ip") || // Cloudflare
    "Unknown IP";
  const { email, password } = await req.json();
  const user = await getUserFromEmail(email);

  // check user exists
  if (user === null) {
    return response(false, "Invalid email or password", 401);
  }

  // check password matches
  const valid = verifyPassword(password, user.password);
  if (!valid) return response(false, "Invalid email or password", 401);

  // Authenticated! create tokens and send
  // TODO more validation. these refresh token functions don't throw an error on fail
  const accessToken = await generateAccessToken({ id: user.id });
  const refreshToken = await generateRefreshToken();

  const result = await insertRefreshToken(refreshToken, user.id, accessToken, ip);

  if (!result) throw new Error("error logging in");

  const res = NextResponse.json({ success: true });
  // Access token cookie
  res.cookies.set({
    name: "accessToken",
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // More compatible than strict
    path: "/",
    maxAge: parseInt(JWT_EXPIRY), // 15 minutes (matches access token expiry)
  });

  // Refresh token cookie
  res.cookies.set({
    name: "refreshToken",
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: parseInt(REFRESH_TOKEN_EXPIRY), // 7 days (matches refresh token expiry)
  });

  return res;
}
