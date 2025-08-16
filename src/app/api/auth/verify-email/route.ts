import { type NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import {
	deleteAccessCode,
	emailVerified,
	getAccessCode,
	getUserFromSub,
} from "@/lib/helper";
import type { AuthUser } from "@/lib/types";

const ACCESS_CODE_TYPE = "email";

export async function POST(req: NextRequest) {
	try {
		const { userId, accessCodeString } = await req.json();

		if (!userId || !accessCodeString)
			return NextResponse.json({
				success: false,
				message: "Invalid request data",
			});

		// authenticate that logged in user is the one trying to verify email
		authenticate(userId);

		// authentication successful, proceed with email verification logic
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

		if (accessCodeString === accessCode.accessCode) {
			// update in db
			await emailVerified(userId);

			// delete access code
			await deleteAccessCode(userId, ACCESS_CODE_TYPE);
			const user = await getUserFromSub(userId);

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
		}

		return NextResponse.json(
			{ success: false, message: "Not implemented" },
			{ status: 501 },
		);
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Unknown Error");
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
