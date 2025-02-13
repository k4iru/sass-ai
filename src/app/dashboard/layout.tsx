"use client";

import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setCurrUser, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${ApiUrl}/api/auth/get-user`, {
          method: "POST",
          credentials: "include", // Include cookies in the request
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          const currUserSet = await setCurrUser(data.user);

          if (!currUserSet) router.push("/login");
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Authentication check failed:", err);
        router.push("/login");
      } finally {
        if (user) {
          setLoading(false);
        }
      }
    };
    if (!user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, router, setCurrUser]);

  if (loading) {
    // TODO create loader
    return <div>Loading authentication status...</div>;
  }

  if (!user) {
    return (
      <div>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default DashboardLayout;
