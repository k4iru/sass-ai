import { type NextRequest, NextResponse } from "next/server";
import { getAllChats } from "@/lib/nextUtils";
import { validateToken } from "@/shared/lib/jwt";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
	// add user authentication as well.
	try {
		const body = await req.json();
		const { userId } = body;

		const verified = validateToken(req.cookies.get("accessToken")?.value);
		if (!verified)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		if (!userId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const chatRooms = await getAllChats(userId);

		return NextResponse.json(
			{ success: true, chats: chatRooms },
			{ status: 200 },
		);
	} catch (err) {
		console.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to create chatroom" },
			{ status: 500 },
		);
	}
}
