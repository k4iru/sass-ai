"use client";
import React, { useEffect, use } from "react";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function ChatToFile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`${ApiUrl}/api/auth/get-files`, {
        method: "POST",
        credentials: "include", // Include cookies in the request
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: id,
        }),
      });

      const data = await res.json();
      console.log(data);
      console.log("test");
    };
    fetchData();
  }, [id]);
  return <div>ChatToFile</div>;
}

export default ChatToFile;
