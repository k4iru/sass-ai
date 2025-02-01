import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateAccessToken } from "./jwt";
import { randomBytes } from "crypto";

const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "";
type User = typeof schema.usersTable.$inferSelect;

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};

export async function isExistingUser(email: string): Promise<boolean> {
  const existingUser = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));
  return existingUser.length > 0;
}

export async function getUserFromEmail(email: string): Promise<User | null> {
  const user = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));

  if (!user.length) return null;

  return user[0];
}

export async function generateRefreshToken(): Promise<string> {
  let newRefreshTokenId = `sessId__${randomBytes(32).toString("hex")}`;
  const tokenExists = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

  // conflict, retry once more.
  if (tokenExists.length) {
    newRefreshTokenId = `sessId__${randomBytes(32).toString("hex")}`;
    const result = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

    if (result.length) throw new Error("cannot generate new token");
  }

  return newRefreshTokenId;
}

// TODO validation based on things such as ip, user agent, etc
export async function generateNewTokens(refreshToken: string): Promise<{ newAccessToken: string; newRefreshToken: string } | null> {
  // validate refresh token
  console.log("gen new token 1");
  const validRefreshToken = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.refreshToken, refreshToken));
  if (!validRefreshToken.length) return null;
  console.log("gen new token 2");

  // get user from db
  const user = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, validRefreshToken[0].userId));
  if (!user.length) return null;
  console.log("gen new token 3");

  const token = { sub: user[0].id };
  console.log("gen new token 4");

  const newAccessToken = generateAccessToken(token);
  const newRefreshToken = generateRefreshToken(token);
  console.log("gen new token 5");

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

export async function insertRefreshToken(refreshToken: string, userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + parseInt(REFRESH_TOKEN_EXPIRY));

    const newRefreshTokenRow: typeof schema.refreshTokensTable.$inferInsert = {
      id: refreshToken,
      userId: userId,
      expiryDate: expiryDate,
    };

    const result = await db.insert(schema.refreshTokensTable).values(newRefreshTokenRow);
    if (!result) throw new Error("Error inserting new refresh token into table");
    return true;
  } catch (err) {
    console.log("error inserting new refresh token: " + (err instanceof Error ? err.message : "Unknown error"));
    return false;
  }
}
