export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/shared/redis";

// grabs token from request body, checks if it exists in redis, then deletes it to prevent reuse
export async function POST(req: NextRequest): Promise<NextResponse> {
	const { token } = await req.json();
	if (!token)
		return NextResponse.json({ error: "Missing token" }, { status: 400 });

	const redis = getRedis();

	// this is the raw string stored in redis which contains userId and chatId
	const raw = await redis.get(`ws:token:${token}`);
	if (!raw)
		return NextResponse.json(
			{ error: "Invalid or expired token" },
			{ status: 401 },
		);

	await redis.del(`ws:token:${token}`);

	return NextResponse.json(JSON.parse(raw));
}
