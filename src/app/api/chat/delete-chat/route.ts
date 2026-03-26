export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { deleteChat } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat delete-chat" });

async function handler(req: NextRequest, userId: string) {
	try {
		const body = await req.json();
		const { pendingDeleteId } = body;

		if (!pendingDeleteId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const success = await deleteChat(userId, pendingDeleteId);

		if (success) {
			return NextResponse.json({ success: success }, { status: 200 });
		}

		return NextResponse.json({ success: success }, { status: 400 });
	} catch (err) {
		logger.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to delete chat" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
