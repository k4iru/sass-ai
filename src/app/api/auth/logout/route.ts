export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getJwtConfig } from "@/lib/jwtConfig";
import { deleteRefreshToken } from "@/lib/nextUtils";
import { getUserSubFromJWT } from "@/shared/lib/jwt";
import { invalidateApiKeyCache } from "@/shared/lib/langchain/llmFactory";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api auth logout" });

export async function POST(req: NextRequest) {
	try {
		const refreshToken = req.cookies.get("refreshToken")?.value;
		if (refreshToken === undefined)
			return NextResponse.json({ error: "Invalid cookies" }, { status: 400 });

		// deletes session id from database
		const success = await deleteRefreshToken(refreshToken);

		if (!success) {
			return NextResponse.json(
				{ error: "Failed to delete session" },
				{ status: 500 },
			);
		}

		const accessToken = req.cookies.get("accessToken")?.value;
		if (accessToken) {
			const userId = getUserSubFromJWT(accessToken, getJwtConfig());
			if (userId) {
				try {
					await invalidateApiKeyCache(userId);
				} catch (err) {
					logger.warn("failed to invalidate apikey cache on logout", { err });
				}
			}
		}

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
		logger.error("failed to logout properly", {
			error: err instanceof Error ? err.message : "unknown error",
		});
		return NextResponse.json(
			{ error: "Failed to delete session" },
			{ status: 500 },
		);
	}
}
