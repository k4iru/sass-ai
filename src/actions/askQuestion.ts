"use server";

import { useAuth } from "@/context/AuthContext";
import { authenticate } from "@/lib/auth";

export async function askQuestion(id: string, question: string) {
  authenticate();
  const { user } = useAuth();
}
