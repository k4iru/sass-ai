import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
type User = typeof schema.usersTable.$inferSelect;
type RefreshToken = typeof schema.refreshTokensTable.$inferSelect;

export function getClientIP(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || // Cloudflare/Proxy support
    req.headers.get("x-real-ip") || // Nginx support
    req.headers.get("cf-connecting-ip") || // Cloudflare
    "Unknown IP";
  return ip;
}

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};

export function timeStringToSeconds(input: string): number {
  const timeMatch = input.match(/^(\d+)([smhd])$/);

  if (!timeMatch) {
    throw new Error(`Invalid time format: ${input}. Use format like "15m" or "7d"`);
  }

  const value = parseInt(timeMatch[1]);
  const unit = timeMatch[2];

  const conversionRates: { [key: string]: number } = {
    s: 1, // seconds
    m: 60, // minutes → seconds
    h: 60 * 60, // hours → seconds
    d: 24 * 60 * 60, // days → seconds
  };

  if (!conversionRates[unit]) {
    throw new Error(`Invalid time unit: ${unit}. Use s/m/h/d`);
  }

  return value * conversionRates[unit];
}

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
  let newRefreshTokenId = `sessId__${crypto.randomUUID()}`;
  const tokenExists = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

  // conflict, retry once more.
  if (tokenExists.length) {
    newRefreshTokenId = `sessId__${crypto.randomUUID()}`;
    const result = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

    if (result.length) throw new Error("cannot generate new token");
  }

  return newRefreshTokenId;
}

export async function getRefreshToken(refreshToken: string): Promise<RefreshToken> {
  const query = await db.select().from(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, refreshToken));

  // token doesn't exist
  if (!query.length) throw new Error("Couldn't find refresh token");
  return query[0];
}

export async function deleteRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const result = await db.delete(schema.refreshTokensTable).where(eq(schema.refreshTokensTable.id, refreshToken));

    // explicity throw an error
    if (!result.rowCount) {
      throw new Error("failed to delete from database");
    }
  } catch (err) {
    console.log("error deleting refresh token" + (err instanceof Error ? err.message : "Unknown error"));
    return false;
  }

  return true;
}

export async function insertRefreshToken(refreshToken: string, userId: string, accessToken: string, ip: string): Promise<boolean> {
  try {
    console.log("in inserting refresh token");
    const ms = new Date().getTime() + parseInt(REFRESH_TOKEN_EXPIRY) * 1000; // 7 days
    const expiryDate = new Date(ms);

    const newRefreshTokenRow: typeof schema.refreshTokensTable.$inferInsert = {
      id: refreshToken,
      userId: userId,
      accessToken: accessToken,
      ipAddress: ip,
      expiryDate: expiryDate,
    };

    const result = await db.insert(schema.refreshTokensTable).values(newRefreshTokenRow);
    if (!result) throw new Error("Error inserting new refresh token into table");
    return true;
  } catch (err) {
    console.log("database error: " + (err instanceof Error ? err.message : "Unknown error"));
    return false;
  }
}
