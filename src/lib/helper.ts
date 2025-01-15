import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateAccessToken, generateRefreshToken, getUserEmailFromJWT } from "./jwt";

type User = typeof schema.usersTable.$inferSelect;

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};

export async function isExistingUser(email: string): Promise<boolean> {
  const existingUser = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));
  return existingUser.length > 0;
}

export async function getUser(email: string): Promise<User | null> {
  const user = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));

  if (!user.length) return null;

  return user[0];
}

// TODO validation based on things such as ip, user agent, etc
export async function generateNewTokens(refreshToken: string): Promise<{ newAccessToken: string; newRefreshToken: string } | null> {
  // validate refresh token
  const validRefreshToken = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.refreshToken, refreshToken));
  if (!validRefreshToken.length) return null;

  // get user from db
  const user = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, validRefreshToken[0].userId));
  if (!user.length) return null;

  const newAccessToken = generateAccessToken(user[0]);
  const newRefreshToken = generateRefreshToken(user[0]);

  return { newAccessToken: newAccessToken, newRefreshToken: newRefreshToken };
}

export async function deleteRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const result = await db.delete(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.refreshToken, refreshToken));

    // explicity throw an error
    if (!result) {
      throw new Error("failed to delete from database");
    }
  } catch (err) {
    console.log("error deleting refresh token" + (err instanceof Error ? err.message : "Unknown error"));
    return false;
  }

  return true;
}

export async function insertRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const userEmail = getUserEmailFromJWT(refreshToken);
    if (userEmail === null) throw new Error("Invalid token");

    const user = await getUser(userEmail);
    if (user === null) throw new Error("Invalid User");

    const newRefreshTokenRow: typeof schema.refreshTokensTable.$inferInsert = {
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      refreshToken: refreshToken,
    };

    const result = await db.insert(schema.refreshTokensTable).values(newRefreshTokenRow);
    if (!result) throw new Error("Error inserting new refresh token into table");
    return true;
  } catch (err) {
    console.log("error inserting new refresh token: " + (err instanceof Error ? err.message : "Unknown error"));
    return false;
  }
}
