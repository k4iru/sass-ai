import { NextResponse, NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyToken } from "@/lib/jwt";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const JWT_AUD = process.env.JWT_AUD || "";
const JWT_ISS = process.env.JWT_ISS || "";

// TODO move s3client to a separate helper file

export async function POST(req: NextRequest) {
  // add user authentication as well.
  try {
    const body = await req.json();
    const { userId, fileName, fileType } = body;

    const accessToken = req.cookies.get("accessToken")?.value;
    if (!accessToken) return NextResponse.json({ error: "invalid credentials", message: "invalid token" }, { status: 401 });

    // verify token first
    const decoded = await verifyToken(accessToken);
    if (decoded.aud !== JWT_AUD || decoded.iss !== JWT_ISS) throw new Error("Invalid token claims");

    if (!userId || !fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const key = `${userId}/${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL valid for 5 minutes

    return NextResponse.json({
      signedUrl,
      fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    });
  } catch (err) {
    console.error("Error generated signed URL:", err);
    return NextResponse.json({ error: "failed to generate signed url" }, { status: 500 });
  }
}
