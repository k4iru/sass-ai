import { getUserFromSub } from "@/lib/helper";
import { verifyToken } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

const JWT_AUD = process.env.JWT_AUD || "";
const JWT_ISS = process.env.JWT_ISS || "";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("accessToken")?.value;
    if (!accessToken) return NextResponse.json({ error: "invalid credentials", message: "invalid token" }, { status: 401 });

    // verify token first
    const decoded = await verifyToken(accessToken);
    if (decoded.aud !== JWT_AUD || decoded.iss !== JWT_ISS) throw new Error("Invalid token claims");

    const userObject = await getUserFromSub(decoded.sub);

    if (!userObject) throw new Error("Invalid");

    const user = {
      id: userObject.id,
      email: userObject.email,
      accessToken: accessToken,
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Unknown Error");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
