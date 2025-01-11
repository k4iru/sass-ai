import { getUserEmailFromJWT, verifyToken } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  try {
    const accessToken = await req.json();
    if (accessToken) {
      const payload = verifyToken(accessToken);
      const user = getUserEmailFromJWT(accessToken);
      console.log(payload);
      console.log(user);

      //throw new Error("TokenExpiredError");
      return NextResponse.next();
    }
  } catch (err) {
    console.log(err instanceof Error ? err.name : "Unknown error");
    return NextResponse.json({ message: "access token expired. refresh required." }, { status: 401 });
  }
}

export const config = {
  matcher: ["/dashboard/:path*"], // Protect these routes
};
