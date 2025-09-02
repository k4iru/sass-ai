"use client";
import { useState } from "react";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export enum StatusText {
	UPLOADING = "Uploading file...",
	UPLOADED = "File successfully uploaded",
	SAVING = "Saving file to database...",
	GENERATING = "Generating AI Embeddings, this will only take a few seconds...",
}

export type Status = StatusText[keyof StatusText];

function useUpload() {
	const [fileId, setFileId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleUpload = async (file: File, userId: string) => {
		setIsLoading(true);
		setError(null);

		// TODO: rework this portion. no longer needed to upload to aws for pdf viewing.

		try {
			if (!file?.type || !file?.name) {
				throw new Error("Invalid file object");
			}

			const res = await fetch(`${ApiUrl}/api/auth/generate-upload-url`, {
				method: "POST",
				credentials: "include", // Include cookies in the request
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
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to get upload URL");
			}

			const { signedUrl, fileId, fileUrl } = await res.json();

			// Validate AWS response
			if (!signedUrl || !fileUrl || !fileId) {
				throw new Error("Invalid server response");
			}

			// upload to s3
			const awsRes = await fetch(signedUrl, {
				method: "PUT",
				body: file,
				headers: { "Content-Type": file.type },
			});

			if (!awsRes.ok) {
				throw new Error("S3 upload failed");
			}

			// generate embeddings server action
			setFileId(fileId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
			throw err; // Re-throw for component handling
		} finally {
			setIsLoading(false);
		}
	};

	return { fileId, handleUpload, error, isLoading };
}

export default useUpload;
