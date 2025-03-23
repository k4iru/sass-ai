import { NextResponse, NextRequest } from "next/server";
import { userVerified, verifyToken } from "@/lib/jwt";
import { getAWSSignedUrl, getFileUrl } from "@/lib/s3";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
  // add user authentication as well.
  try {
    const body = await req.json();
    const { userId, fileName, fileType } = body;

    const verified = userVerified(req.cookies.get("accessToken")?.value);
    if (!verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!userId || !fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const key = `${userId}/${fileId}`;
    const signedUrl = await getAWSSignedUrl(key, fileType);

    return NextResponse.json({
      signedUrl,
      fileId: fileId,
      fileUrl: getFileUrl(key),
    });
  } catch (err) {
    console.error("Error generated signed URL:", err);
    return NextResponse.json({ error: "failed to generate signed url" }, { status: 500 });
  }
}
