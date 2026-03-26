export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { createChatRoom, insertMessage } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat create-chatroom" });

async function handler(req: NextRequest, userId: string) {
	try {
		const body = await req.json();
		const { chatObj, message } = body;

		if (!chatObj || !message) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const { chatId, model, title } = chatObj;

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
		logger.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to create chatroom" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
