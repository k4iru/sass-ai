import { NextRequest, NextResponse } from "next/server";
import { userVerified } from "@/lib/jwt";
import { getMessages } from "@/lib/helper";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, chatId } = body;

    const verified = userVerified(req.cookies.get("accessToken")?.value);
    if (!verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!userId || !chatId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // returns an array of Messages
    const messages = await getMessages(userId, chatId);

    return NextResponse.json(messages, { status: 200 });
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "failed to get messages" }, { status: 500 });
  }
}
