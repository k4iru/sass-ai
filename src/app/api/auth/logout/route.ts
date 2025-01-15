import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("refreshToken", "", { maxAge: 0, path: "/", httpOnly: true, secure: true });
  return response;
}
