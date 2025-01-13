"use client";
import Documents from "@/components/Documents";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { redirect } from "next/navigation";

function Dashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const { accessToken, refreshAccessToken } = useAuth();

  useEffect(() => {
    console.log(`access token beginning: ` + accessToken);
    const fetchData = async () => {
      try {
        refreshAccessToken();
      } catch (err) {
        console.log(`error getting refresh token` + (err instanceof Error ? err.message : "unknown"));
      }
    };
    fetchData();

    if (accessToken !== null) setAuthenticated(true);

    console.log(`access token end: ` + accessToken);
  }, [accessToken]);

  console.log(`dashboard access token: ` + accessToken);
  if (!authenticated)
    return (
      <div>
        <p>not authenticated</p>
      </div>
    );

  return (
    <div className="h-full max-w-7xl mx-auto">
      <h1 className="text-indigo-600 font-extralight bg-gray-100 text-3xl text-center pt-8">My Documents</h1>
      <Documents />
    </div>
  );
}

export default Dashboard;
