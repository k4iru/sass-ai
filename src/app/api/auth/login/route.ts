"use server";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { isExistingUser, getUser, response } from "@/lib/helper";
import { db, schema } from "@/db";

// TODO error checking, refactor, robustness
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const user = await getUser(email);

  // check user exists
  if (user === null) {
    return response(false, "Invalid email or password", 401);
  }

  // check password matches
  const valid = verifyPassword(password, user.password);
  if (!valid) return response(false, "Invalid email or password", 401);

  // Authenticated! create tokens and send
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const newRefreshTokenRow: typeof schema.refreshTokensTable.$inferInsert = {
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    refreshToken: refreshToken,
  };

  const result = await db.insert(schema.refreshTokensTable).values(newRefreshTokenRow);

  // return access token in json. refresh token in httpOnly cookie
  const res = NextResponse.json({ accessToken });
  res.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return res;
}
