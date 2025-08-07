import { type NextRequest, NextResponse } from "next/server";
import { getFileUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
	const { key } = await req.json();

	if (!key || key === "")
		return NextResponse.json(
			{ error: "invalid response", message: "no file" },
			{ status: 401 },
		);

	const fileUrl = getFileUrl(key);

	return NextResponse.json({ fileUrl: fileUrl }, { status: 200 });
}
