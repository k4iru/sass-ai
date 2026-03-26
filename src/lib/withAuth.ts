import { type NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/shared/lib/jwt";
import { getLogger } from "@/shared/logger";
import { authenticate } from "./auth";
import { getJwtConfig } from "./jwtConfig";

const logger = getLogger({ module: "api auth" });

export function withAuth(
	handler: (req: NextRequest, userId: string) => Promise<NextResponse | Response>,
) {
	return async (req: NextRequest) => {
		try {
			const accessToken = req.cookies.get("accessToken")?.value ?? "";
			const refreshTokenId = req.cookies.get("refreshToken")?.value ?? "";

			const payload = await validateToken(getJwtConfig(), accessToken);

			if (!payload?.sub) {
				throw new Error("Invalid token");
			}

			const userId = payload.sub;
			await authenticate(userId, accessToken, refreshTokenId);
			return await handler(req, userId);
		} catch (error) {
			logger.error("Authentication error:", error);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	};
}
