import { NextRequest, NextResponse } from "next/server";
import { response, generateNewTokens, deleteRefreshToken, insertRefreshToken } from "@/lib/helper";
import { getUserSubFromJWT } from "@/lib/jwt";

// TODO move session management to redis for speed
export async function POST(req: NextRequest) {
  // grab current refresh token
  const refreshToken = req.cookies.get("refreshToken");
  if (refreshToken === undefined) return response(false, "Refresh token missing", 401);

  const userId = getUserSubFromJWT(refreshToken.value);
  console.log("userId:", userId);

  if (userId === null || userId === undefined) throw new Error("cant get user from token");

  console.log("test 1");
  const newTokens = await generateNewTokens(refreshToken.value);

  if (newTokens === null) return response(false, "Invalid token", 401);
  console.log("test 2");

  const { newAccessToken, newRefreshToken } = newTokens;

  const delToken = deleteRefreshToken(refreshToken.value);
  if (!delToken) return response(false, "Database Error", 401);
  console.log("test 3");

  // insert new access token into db
  await insertRefreshToken(newRefreshToken, userId);
  console.log("test 4");

  const res = NextResponse.json({ accessToken: newAccessToken, id: userId });
  res.cookies.set("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  console.log("test 5");

  return res;

  // TODO delete old refresh token for now have them stay for debugging
}
