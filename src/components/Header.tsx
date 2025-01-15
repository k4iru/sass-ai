import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { FilePlus2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function Header() {
  const { logout } = useAuth();
  const handleClick = () => {
    logout();
  };
  return (
    <div className="flex justify-between bg-white shadow-sm p-5 border-b">
      <Link
        href="/dashboard"
        className="text-2xl">
        Chat to <span className="text-indigo-600">PDF</span>
      </Link>

      <div>
        <div className="flex items-center space-x-2">
          <Button
            asChild
            variant="link"
            className="hidden md:flex">
            <Link href="/dashboard/upgrade">Pricing</Link>
          </Button>

          <Button
            asChild
            variant="outline">
            <Link href="/dashboard">My Documents</Link>
          </Button>

          <Button
            asChild
            variant="outline">
            <Link href="/dashboard/upload">
              <FilePlus2 className="text-indigo-600" />
            </Link>
          </Button>

          <Button
            asChild
            onClick={handleClick}>
            <p>Logout</p>
          </Button>

          {/* User Button */}
        </div>
      </div>
    </div>
  );
}

export default Header;
