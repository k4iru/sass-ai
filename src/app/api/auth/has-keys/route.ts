export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { apiKeysExist } from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api auth has-keys" });

async function handler(req: NextRequest, userId: string) {
	try {
		// convert AVAILABLE_LLM_PROVIDERS to a dict where each provider is false
		const providersDict = await apiKeysExist(userId);

		if (!providersDict) {
			return NextResponse.json(
				{ error: "couldn't get providers" },
				{ status: 500 },
			);
		}
		// check if user has keys for each provider. if yes, set to true

		return NextResponse.json(providersDict, { status: 200 });
	} catch (error) {
		logger.error("Error occurred while checking for keys", { error });
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
