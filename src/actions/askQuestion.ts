"use server";

import { useAuth } from "@/context/AuthContext";
import { authenticate } from "@/lib/auth";
import { Message } from "@/types/types";
import { insertMessage } from "@/lib/helper";

// implemented as server action
export async function askQuestion(message: Message) {
  authenticate();
  const { user } = useAuth();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // insert into db
  const success = await insertMessage(message);

  // send message to api for response and insert into db
}
