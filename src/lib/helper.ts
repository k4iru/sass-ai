import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@/db/schema";

type User = typeof usersTable.$inferSelect;

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};

export async function isExistingUser(email: string) {
  const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return existingUser.length > 0;
}

export async function getUser(email: string): Promise<User | null> {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user.length) return null;

  return user[0];
}
