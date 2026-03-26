export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/lib/withAuth";
import { getRedis } from "@/shared/redis";

async function handler(req: NextRequest, userId: string) {
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

export const POST = withAuth(handler);
