export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getUserFromSub } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import type { AuthUser } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api auth get-user" });

async function handler(_req: NextRequest, userId: string) {
	try {
		const userObject = await getUserFromSub(userId);

		if (!userObject) throw new Error("User not found");

		const user: AuthUser = {
			id: userObject.id,
			emailVerified: userObject.emailVerified,
		};

		return NextResponse.json({ user }, { status: 200 });
	} catch (err) {
		logger.error(err instanceof Error ? err.message : "Unknown Error");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
}

export const POST = withAuth(handler);
