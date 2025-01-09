import { NextRequest } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { isExistingUser, getUser, response } from "@/lib/helper";
import { db, schema } from "@/db";

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
  console.log(accessToken);

  const refreshToken = generateRefreshToken(user);
  console.log(refreshToken);

  await db.insert(schema.tokensTable).values({
    id: crypto.randomUUID,
    userId: user.id,
    refreshToken: refreshToken,
  });
}
