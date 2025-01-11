import { verifyToken } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = await req.json();
  
  try {
    if (accessToken) {
      verifyToken(accessToken);
    }
  }
}
