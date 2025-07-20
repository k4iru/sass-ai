import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import type { Message } from "@/lib/types";
import { insertMessage } from "@/lib/helper";
import { askQuestion } from "@/lib/langchain";

async function handler(req: NextRequest) {
	// expect a Message object in the request body
	try {
		const body = await req.json();

		console.log("body", body);
		if (!isMessage(body)) {
			return NextResponse.json(
				{ success: false, message: "malformed message" },
				{ status: 400 },
			);
		}

		const success = await insertMessage(body);
		if (!success) {
			return NextResponse.json(
				{ success: false, message: "error inserting message" },
				{ status: 400 },
			);
		}

		askQuestion(body);

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.error(err instanceof Error ? err.message : "unknown error");
		return NextResponse.json(
			{ success: false, message: "error pushing message" },
			{ status: 400 },
		);
	}
}

function isMessage(obj: Message): obj is Message {
	return (
		["human", "ai", "placeholder"].includes(obj.role) &&
		typeof obj.chatId === "string" &&
		typeof obj.userId === "string" &&
		typeof obj.content === "string" &&
		new Date(obj.createdAt) instanceof Date
	);
}

export const POST = withAuth(handler);
