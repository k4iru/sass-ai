import { type NextRequest, NextResponse } from "next/server";
import { getJwtConfig } from "@/lib/jwtConfig";
import { deleteChat } from "@/lib/nextUtils";
import { validateToken } from "@/shared/lib/jwt";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
	// add user authentication as well.
	try {
		const body = await req.json();
		const { userId, pendingDeleteId } = body;

		console.log(userId);
		console.log(pendingDeleteId);

		const verified = validateToken(
			getJwtConfig(),
			req.cookies.get("accessToken")?.value ?? "",
		);
		if (!verified)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		if (!userId) {
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
		console.error(err instanceof Error ? err.message : "Unknown error");
		return NextResponse.json(
			{ error: "failed to create chatroom" },
			{ status: 500 },
		);
	}
}
