"use client";
import {
	CheckCircleIcon,
	CircleArrowDown,
	HammerIcon,
	RocketIcon,
	SaveIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/context/AuthContext";
import useUpload from "@/hooks/useUpload";

function FileUploader() {
	const { fileId, handleUpload } = useUpload();
	const router = useRouter();
	const { user } = useAuth();

	useEffect(() => {
		if (!user) {
			router.replace("/login");
			return;
		}
		if (fileId && user) {
			router.replace(`/dashboard/files/${fileId}`);
			return;
		}
	}, [fileId, router, user]);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			const file = acceptedFiles[0];

			if (file && user) {
				handleUpload(file, user.id);
			}
		},
		[user, handleUpload],
	);
	const { getRootProps, getInputProps, isDragActive, isFocused, isDragAccept } =
		useDropzone({
			onDrop,
			maxFiles: 1,
			accept: {
				"application/pdf": [".pdf"],
			},
		});

	if (!user) return <div>Unauthorized</div>;
	return (
		<div className="flex flex-col gap-4 items-center max-w-7xl mx-auto">
			<div
				{...getRootProps()}
				className={`p-10 border-2 border-dashed mt-10 w-[90%] border-indigo-600 text-indigo-600 rounded-lg h-96 flex items-center justify-center ${
					isFocused || isDragAccept ? "bg-indigo-300" : "bg-indigo-100"
				}`}
			>
				<input {...getInputProps()} />
				<div className="flex flex-col items-center justify-center">
					{isDragActive ? (
						<>
							<RocketIcon className="h-20 w-20 animate-ping" />
							<p>Drop the files here ...</p>
						</>
					) : (
						<>
							<CircleArrowDown className="h-20 w-20 animate-bounce" />
							<p>Drag n drop some files here, or click to select files</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default FileUploader;
