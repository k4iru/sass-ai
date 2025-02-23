import { verifyToken } from "@/lib/jwt";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
const JWT_AUD = process.env.JWT_AUD || "";
const JWT_ISS = process.env.JWT_ISS || "";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("accessToken")?.value;
    if (!accessToken) return NextResponse.json({ error: "invalid credentials", message: "invalid token" }, { status: 401 });

    // verify token first
    const decoded = await verifyToken(accessToken);
    if (decoded.aud !== JWT_AUD || decoded.iss !== JWT_ISS) throw new Error("Invalid token claims");

    const id = decoded.sub;

    const command = new ListObjectsV2Command({
      Bucket: AWS_BUCKET_NAME,
      Prefix: `${id}/`,
    });

    const response = await s3Client.send(command);

    const files =
      response.Contents?.map((file) => ({
        key: file.Key,
        lastModified: file.LastModified,
        size: file.Size,
        url: `https://${AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
      })) || [];

    return NextResponse.json({ files }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
