"use client";
import PdfView from "@/components/PdfView";
import { useAuth } from "@/context/AuthContext";
import { getFileUrl } from "@/lib/s3";
import React, { useEffect, use, useState } from "react";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function ChatToFile({ params }: { params: Promise<{ fileId: string }> }) {
  const { user } = useAuth();
  const { fileId } = use(params);

  console.log("inside chatotFile");

  if (!user)
    return (
      <div>
        <p>loading...</p>
      </div>
    );
  return (
    <div className="grid lg:grid-cols-5 h-full overflow-hidden">
      {/*Right */}
      <div className="col-span-5 lg:col-span-2 overflow-y-auto">{/* chat */}</div>
      {/*left*/}
      <div className="col-span-5 log:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:-order-1 overflow-auto">
        <PdfView
          userId={user.id}
          fileId={fileId}
        />
      </div>
    </div>
  );
}

export default ChatToFile;
