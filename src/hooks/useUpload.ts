"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserEmailFromJWT } from "@/lib/jwt";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export enum StatusText {
  UPLOADING = "Uploading file...",
  UPLOADED = "File successfully uploaded",
  SAVING = "Saving file to database...",
  GENERATING = "Generating AI Embeddings, this will only take a few seconds...",
}

export type Status = StatusText[keyof StatusText];

function useUpload() {
  //const [progress, setProgress] = useState<number | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  //const [status, setStatus] = useState<Status | null>(null);

  const { accessToken } = useAuth();

  const userId = getUserEmailFromJWT(accessToken!);
  console.log(userId);

  // get user context

  const handleUpload = async (file: File) => {
    if (!file) {
      return;
    }

    try {
      const response = await fetch(`${ApiUrl}/api/auth/generate-upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      // wait for response
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "failed to get signed url");
      console.log("fileurl", data);

      // upload to s3

      await fetch(data.signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      setFileId(data.fileUrl);
    } catch (error) {
      console.error("upload error: ", error);
    }
  };

  return { fileId, handleUpload };
}

export default useUpload;
