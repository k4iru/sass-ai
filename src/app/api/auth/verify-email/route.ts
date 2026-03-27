export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import {
	deleteAccessCode,
	emailVerified,
	getAccessCode,
	getUserFromId,
} from "@/lib/nextUtils";
import { withAuth } from "@/lib/withAuth";
import type { AuthUser } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "api auth verify-email" });

const ACCESS_CODE_TYPE = "email";

async function handler(req: NextRequest, userId: string) {
	try {
		const { accessCodeString } = await req.json();

		if (!accessCodeString)
			return NextResponse.json({
				success: false,
				message: "Invalid request data",
			});

		const accessCode = await getAccessCode(userId, ACCESS_CODE_TYPE);
		if (!accessCode) {
			return NextResponse.json({
				success: false,
				message: "invalid request",
			});
		}

		if (accessCodeString !== accessCode.accessCode) {
			return NextResponse.json({
				success: false,
				message: "Invalid access code",
			});
		}

		await emailVerified(userId);
		await deleteAccessCode(userId, ACCESS_CODE_TYPE);

		const user = await getUserFromId(userId);
		if (!user)
			return NextResponse.json({
				success: false,
				message: "User not found",
			});

		const authUser: AuthUser = {
			id: user.id,
			emailVerified: user.emailVerified,
		};

		return NextResponse.json({
			success: true,
			user: authUser,
		});
	} catch (error) {
		logger.error(error instanceof Error ? error.message : "Unknown Error");
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth(handler);
