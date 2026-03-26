export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getAllChats } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat get-all-chats" });

async function handler(_req: NextRequest, userId: string) {
	try {
		const chatRooms = await getAllChats(userId);

		return NextResponse.json(
			{ success: true, chats: chatRooms },
			{ status: 200 },
		);
	} catch (err) {
		logger.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to get chats" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
