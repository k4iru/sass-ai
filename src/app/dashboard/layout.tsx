"use client";

import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const { accessToken, refreshAccessToken, userId } = useAuth();

  useEffect(() => {}, [accessToken, userId]);

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
