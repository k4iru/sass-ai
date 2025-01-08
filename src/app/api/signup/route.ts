import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { db } from "@/db";
import { signupSchema } from "@/lib/validation/signupSchema";
import { usersTable } from "@/db/schema";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // server side validation
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message).join(", ");
      return NextResponse.json({ message: errors }, { status: 409 });
    }

    const hashedPassword = await hashPassword(body.password);

    const user: typeof usersTable.$inferInsert = {
      name: body.name,
      email: body.email,
      password: hashedPassword,
    };

    const result = await db.insert(usersTable).values(user);
    if (!result) return NextResponse.json({ message: "Database Error" }, { status: 409 });
  } catch (err) {
    // gracefully exit;
    console.error("Error reading request: " + (err instanceof Error ? err.message : "Unknown error"));
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ message: "Form submitted successfully!" }, { status: 200 });
}
