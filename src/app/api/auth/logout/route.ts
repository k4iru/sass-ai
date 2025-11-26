import { type NextRequest, NextResponse } from "next/server";
import { deleteRefreshToken } from "@/lib/nextUtils";

export async function POST(req: NextRequest) {
	try {
		const refreshToken = req.cookies.get("refreshToken")?.value;
		if (refreshToken === undefined)
			return NextResponse.json({ error: "Invalid cookies" }, { status: 400 });

		// deletes session id from database
		const success = await deleteRefreshToken(refreshToken);

		if (!success)
			NextResponse.json({ error: "Failed to delete session" }, { status: 500 });

		const response = NextResponse.json(
			{ message: "Logged out" },
			{ status: 200 },
		);
		response.cookies.set("refreshToken", "", {
			maxAge: 0,
			path: "/",
			httpOnly: true,
			secure: true,
		});
		response.cookies.set("accessToken", "", {
			maxAge: 0,
			path: "/",
			httpOnly: true,
			secure: true,
		});

		return response;
	} catch (err) {
		console.error(
			"failed to logout properly",
			err instanceof Error ? err.message : "unknown error",
		);
	}
}
