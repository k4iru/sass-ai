"use client";

import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const { accessToken, refreshAccessToken } = useAuth();

  useEffect(() => {
    // 1. check if accesstoken exists and is valid

    // 2. if valid but expired try and refresh

    // 3.

    const fetchData = async () => {
      try {
        refreshAccessToken();
      } catch (err) {
        console.log(`error getting refresh token` + (err instanceof Error ? err.message : "unknown"));
      }
    };
    fetchData();

    if (accessToken !== null) setAuthenticated(true);
    else setAuthenticated(false);
  }, [accessToken]);

  if (!authenticated)
    return (
      <div>
        <p>not authenticated</p>
      </div>
    );
  return (
    <div className="flex flex-col flex-1 h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default DashboardLayout;
