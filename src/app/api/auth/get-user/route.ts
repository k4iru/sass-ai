import { type NextRequest, NextResponse } from "next/server";
import { getUserFromSub } from "@/lib/helper";
import { getUserSubFromJWT, validateToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
	try {
		const accessToken = req.cookies.get("accessToken")?.value;
		if (!accessToken)
			return NextResponse.json(
				{ error: "invalid credentials", message: "invalid token" },
				{ status: 401 },
			);

		// verify token first
		const validToken = await validateToken(accessToken);
		if (!validToken) throw new Error("Invalid token claims");

		// TODO need additional validation to ensure that user owns this token. check refresh token as well
		const sub = getUserSubFromJWT(accessToken);
		if (!sub) throw new Error("Invalid token claims");

		const userObject = await getUserFromSub(sub);

		if (!userObject) throw new Error("Invalid");

		const user = {
			id: userObject.id,
			email: userObject.email,
			accessToken: accessToken,
		};

		return NextResponse.json({ user }, { status: 200 });
	} catch (err) {
		console.error(err instanceof Error ? err.message : "Unknown Error");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
}
