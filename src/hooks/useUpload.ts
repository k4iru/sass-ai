"use client";
import { useState } from "react";

export enum StatusText {
  UPLOADING = "Uploading file...",
  UPLOADED = "File successfully uploaded",
  SAVING = "Saving file to database...",
  GENERATING = "Generating AI Embeddings, this will only take a few seconds...",
}

export type Status = StatusText[keyof StatusText];

function useUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  // get user context

  const handleUpload = async (file: File) => {
    if (!file) return;

    const fileIdToUploadTo = crypto.randomUUID();
  };
}

export default useUpload;
