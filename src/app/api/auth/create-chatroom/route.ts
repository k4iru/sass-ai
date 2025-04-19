import { NextResponse, type NextRequest } from "next/server";
import { userVerified, verifyToken } from "@/lib/jwt";
import { createChatRoom } from "@/lib/helper";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
	// add user authentication as well.
	try {
		const body = await req.json();
		const { userId, chatId } = body;

		const verified = userVerified(req.cookies.get("accessToken")?.value);
		if (!verified)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		if (!userId || !chatId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const success = await createChatRoom(userId, chatId);

		if (!success) {
			return NextResponse.json(
				{ error: "Chat room already exists" },
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
