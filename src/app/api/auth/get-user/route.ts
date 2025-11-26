import { type NextRequest, NextResponse } from "next/server";
import { getJwtConfig } from "@/lib/jwtConfig";
import { getUserFromSub } from "@/lib/nextUtils";
import { getUserSubFromJWT, validateToken } from "@/shared/lib/jwt";
import type { AuthUser } from "@/shared/lib/types";

export async function POST(req: NextRequest) {
	try {
		console.log("Getting user info");
		const accessToken = req.cookies.get("accessToken")?.value;
		if (!accessToken)
			return NextResponse.json(
				{ error: "invalid credentials", message: "invalid token" },
				{ status: 401 },
			);

		console.log("Validating token");
		// verify token first
		const validToken = await validateToken(getJwtConfig(), accessToken);
		if (!validToken) throw new Error("Invalid token claims");

		console.log("Extracting user sub from token");
		// TODO need additional validation to ensure that user owns this token. check refresh token as well
		const sub = getUserSubFromJWT(accessToken, getJwtConfig());
		if (!sub) throw new Error("Invalid token claims");

		console.log("Fetching user from sub");
		const userObject = await getUserFromSub(sub);

		if (!userObject) throw new Error("Invalid");

		console.log("Constructing user response");
		const user: AuthUser = {
			id: userObject.id,
			emailVerified: userObject.emailVerified,
		};

		console.log("Returning user info");
		return NextResponse.json({ user }, { status: 200 });
	} catch (err) {
		console.error(err instanceof Error ? err.message : "Unknown Error");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
}
