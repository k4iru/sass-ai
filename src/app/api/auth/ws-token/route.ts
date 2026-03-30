export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { chatExists, verifyChatOwnership } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getRedis } from "@/shared/redis";

async function handler(req: NextRequest, userId: string) {
	const { chatId } = await req.json();
	if (!chatId) {
		return NextResponse.json(
			{ error: "Missing required fields" },
			{ status: 400 },
		);
	}

	const isOwner = await verifyChatOwnership(userId, chatId);
	if (!isOwner) {
		// check if chat exists first
		// only need to return error if exists since it belongs to someone else in this case.
		const exists = await chatExists(userId, chatId);
		if (exists)
			return NextResponse.json(
				{ error: "Chat not found or unauthorized" },
				{ status: 404 },
			);
	}

	// if doesn't exist then can bypass since the chat isn't in database yet.

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
