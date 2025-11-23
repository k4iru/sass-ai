import { type NextRequest, NextResponse } from "next/server";
import { authenticate } from "./auth";

export function withAuth(
	handler: (req: NextRequest) => Promise<NextResponse> | Response,
) {
	return async (req: NextRequest) => {
		try {
			await authenticate();
			return await handler(req);
		} catch (error) {
			console.error("Authentication error:", error);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	};
}
