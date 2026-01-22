export const runtime = "nodejs"; // Use the full server power

import { type NextRequest, NextResponse } from "next/server";
import { renameChat } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";

async function handler(req: NextRequest) {
	// expect a Message object in the request body
	try {
		const body = await req.json();
		const { userId, chatId, newTitle } = body;

		const success = await renameChat(userId, chatId, newTitle);
		if (!success) {
			return NextResponse.json(
				{ success: false, message: "error renaming chat" },
				{ status: 400 },
			);
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.error(err instanceof Error ? err.message : "unknown error");
		return NextResponse.json(
			{ success: false, message: "error pushing message" },
			{ status: 400 },
		);
	}
}

export const POST = withAuth(handler);
