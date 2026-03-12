export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getJwtConfig } from "@/lib/jwtConfig";
import { getUserSubFromJWT } from "@/shared/lib/jwt";
import { getRedis } from "@/shared/redis";

// generates a onetime uuid as a token to authenticate websocket connections
export async function POST(req: NextRequest): Promise<NextResponse> {
	const token = req.cookies.get("accessToken")?.value ?? "";
	const userId = getUserSubFromJWT(token, getJwtConfig());
	if (!userId)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { chatId } = await req.json();
	const wsToken = uuidv4();
	const redis = getRedis();
	await redis.set(
		`ws:token:${wsToken}`,
		JSON.stringify({ userId, chatId }),
		"EX",
		30,
	);

	return NextResponse.json({ token: wsToken });
}
