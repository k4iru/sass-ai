import { type NextRequest, NextResponse } from "next/server";
import { getUserSubFromJWT } from "@/shared/lib/jwt";
import { authenticate } from "./auth";
import { getJwtConfig } from "./jwtConfig";

export function withAuth(
	handler: (req: NextRequest) => Promise<NextResponse> | Response,
) {
	return async (req: NextRequest) => {
		try {
			const token = req.cookies.get("accessToken")?.value ?? "";
			const userId = getUserSubFromJWT(token, getJwtConfig());

			if (userId === null || userId === "") {
				throw new Error("Invalid token");
			}

			await authenticate(userId);
			return await handler(req);
		} catch (error) {
			console.error("Authentication error:", error);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	};
}
