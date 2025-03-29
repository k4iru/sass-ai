"use client";
import PdfView from "@/components/PdfView";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getFileUrl } from "@/lib/s3";
import React, { useEffect, use, useState } from "react";
import Chat from "@/components/Chat";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function ChatToFile() {
  const [fileKey, setFileKey] = useState<string>();
  const { user } = useAuth();
  const params = useParams();
  const fileId = params?.fileId as string; // Directly access fileId from params
  console.log(`fileId: ${fileId}`);

  useEffect(() => {
    if (user && fileId) {
      setFileKey(`${user.id}/${fileId}`);
    }
  }, [fileId, user]);

  if (!user || !fileId || !fileKey)
    return (
      <div>
        <p>loading...</p>
      </div>
    );
  return (
    <div className="grid lg:grid-cols-5 h-full overflow-hidden">
      {/*Right */}
      <div className="lg:col-span-2 overflow-y-auto">
        <Chat fileKey={fileKey} />
      </div>
      {/*left*/}
      <div className=" lg:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:-order-1 overflow-auto">
        <PdfView fileKey={fileKey} />
      </div>
    </div>
  );
}

export default ChatToFile;
