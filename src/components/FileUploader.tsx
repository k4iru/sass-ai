"use client";
import React, { useCallback, useEffect } from "react";
import Dropzone, { useDropzone } from "react-dropzone";
import useUpload from "@/hooks/useUpload";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, CircleArrowDown, HammerIcon, RocketIcon, SaveIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function FileUploader() {
  const { fileId, handleUpload } = useUpload();
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    if (fileId) {
      //router.push(`/dashboard/files/${fileId}`);
      console.log(fileId);
    }

    if (userId !== undefined) console.log("userid-fileuploader", userId);
  }, [fileId, router, userId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("test on drop");
    // Do something with the files
    const file = acceptedFiles[0];
    console.log("handle file upload");

    if (file && userId !== null && userId !== undefined) handleUpload(file, userId);

    console.log("filed uploaded");

    if (file) {
    }
    console.log(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive, isFocused, isDragAccept } = useDropzone({ onDrop, maxFiles: 1, accept: { "application/pdf": [".pdf"] } });
  return (
    <div className="flex flex-col gap-4 items-center max-w-7xl mx-auto">
      <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed mt-10 w-[90%] border-indigo-600 text-indigo-600 rounded-lg h-96 flex items-center justify-center ${
          isFocused || isDragAccept ? "bg-indigo-300" : "bg-indigo-100"
        }`}>
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
