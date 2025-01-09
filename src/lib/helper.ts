import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

type User = typeof schema.usersTable.$inferSelect;

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};

export async function isExistingUser(email: string) {
  const existingUser = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));
  return existingUser.length > 0;
}

export async function getUser(email: string): Promise<User | null> {
  const user = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email));

  if (!user.length) return null;

  return user[0];
}
