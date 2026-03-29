export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api chat get-messages" });

async function handler(req: NextRequest, userId: string) {
	try {
		const body = await req.json();

		// allowing client do pass back chatid is not good for ownership checks
		const { chatId } = body;

		if (!chatId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const messages = await getMessages(userId, chatId);

		return NextResponse.json(messages, { status: 200 });
	} catch (err) {
		logger.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to get messages" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
