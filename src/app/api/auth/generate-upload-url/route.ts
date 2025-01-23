import { NextResponse, NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, fileName, fileType } = body;
    console.log(userId);

    console.log("in generate upload");
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
