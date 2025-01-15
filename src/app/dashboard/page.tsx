import Documents from "@/components/Documents";
import React from "react";

function Dashboard() {
  return (
    <div className="h-full max-w-7xl mx-auto">
      <h1 className="text-indigo-600 font-extralight bg-gray-100 text-3xl text-center pt-8">My Documents</h1>
      <Documents />
    </div>
  );
}

export default Dashboard;
