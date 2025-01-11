import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { response, generateNewTokens, deleteRefreshToken, insertRefreshToken } from "@/lib/helper";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken");
  if (!refreshToken) return response(false, "Refresh token missing", 401);

  const newTokens = await generateNewTokens(refreshToken.value);
  if (newTokens === null) return response(false, "Invalid token", 401);

  const { newAccessToken, newRefreshToken } = newTokens;

  const delToken = deleteRefreshToken(refreshToken.value);
  if (!delToken) return response(false, "Database Error", 401);

  // insert new access token into db
  insertRefreshToken(newRefreshToken);

  const res = NextResponse.json({ accessToken: newAccessToken });
  res.cookies.set("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return response;

  // delete old refresh token
}
