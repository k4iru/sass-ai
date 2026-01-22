export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getJwtConfig } from "@/lib/jwtConfig";
import { createChatRoom, insertMessage } from "@/lib/nextUtils";
import { validateToken } from "@/shared/lib/jwt";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
	// add user authentication as well.
	try {
		const body = await req.json();
		const { chatObj, message } = body;

		const verified = validateToken(
			getJwtConfig(),
			req.cookies.get("accessToken")?.value ?? "",
		);
		if (!verified)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		if (!chatObj || !message) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const { userId, chatId, model, title } = chatObj;

		console.log("test");
		const success = await createChatRoom(userId, chatId, model, title);

		if (!success) {
			return NextResponse.json(
				{ error: "Chat room already exists" },
				{ status: 409 },
			);
		}

		const newMessage = await insertMessage(message);

		if (!newMessage) {
			return NextResponse.json(
				{ error: "cant insert message" },
				{ status: 409 },
			);
		}

		return NextResponse.json({ success: true }, { status: 201 });
	} catch (err) {
		console.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to create chatroom" },
			{ status: 500 },
		);
	}
}
