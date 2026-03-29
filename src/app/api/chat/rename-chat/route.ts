export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { renameChat, verifyChatOwnership } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat rename-chat" });

async function handler(req: NextRequest, userId: string) {
	try {
		const body = await req.json();
		const { chatId, newTitle } = body;
		if (!chatId || !newTitle) {
			return NextResponse.json(
				{ success: false, message: "Missing required fields" },
				{ status: 400 },
			);
		}

		const isOwner = await verifyChatOwnership(userId, chatId);
		if (!isOwner) {
			return NextResponse.json(
				{ success: false, message: "Chat not found or unauthorized" },
				{ status: 404 },
			);
		}

		const success = await renameChat(userId, chatId, newTitle);
		if (!success) {
			return NextResponse.json(
				{ success: false, message: "error renaming chat" },
				{ status: 400 },
			);
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		logger.error(err instanceof Error ? err.message : "unknown error");
		return NextResponse.json(
			{ success: false, message: "error renaming chat" },
			{ status: 400 },
		);
	}
}

export const POST = withAuth(handler);
