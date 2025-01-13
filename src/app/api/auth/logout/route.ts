import { NextRequest, NextResponse } from "next/server";

export default async function POST(req: NextRequest, res: NextResponse) {
  res.cookies.set("refreshToken", "");
  res.status(200).json({ message: "Logged out" });
}
