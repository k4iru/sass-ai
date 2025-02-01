"use server";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { generateAccessToken } from "@/lib/jwt";
import { getUserFromEmail, insertRefreshToken, generateRefreshToken, response } from "@/lib/helper";
import { db, schema } from "@/db";

// TODO error checking, refactor, robustness
export async function POST(req: NextRequest) {
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
  const accessToken = generateAccessToken({ id: user.id });
  const refreshToken = await generateRefreshToken();

  const result = await insertRefreshToken(refreshToken, user.id);

  if (!result) throw new Error("error logging in");
  // return access token in json. refresh token in httpOnly cookie
  const res = NextResponse.json({ accessToken, id: user.id });
  res.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return res;
}
