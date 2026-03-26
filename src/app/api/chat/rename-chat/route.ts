export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { renameChat } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat rename-chat" });

async function handler(req: NextRequest, userId: string) {
	try {
		const body = await req.json();
		const { chatId, newTitle } = body;

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
