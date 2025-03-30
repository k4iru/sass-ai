"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export type Message = {
  id?: string;
  role: "human" | "ai" | "placeholder";
  message: string;
  createdAt: Date;
};

function Chat({ fileKey }: { fileKey: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "human",
        message: q,
        createdAt: new Date(),
      },
      {
        role: "ai",
        message: "Thinking...",
        createdAt: new Date(),
      },
    ]);

    startTransition(async () => {
      const { success, message } = await askQuestion(id, q);

      if (!success) {
        setMessages((prev) =>
          prev.slice(0, prev.length - 1).concat([
            {
              role: "ai",
              message: `Whoops... ${message}`,
              createdAt: new Date(),
            },
          ])
        );
      }
    });
  };

  if (!user) {
    <div>Please log in to chat.</div>;
    return router.push("/login");
  }
  return (
    <div className="flex flex-col h-full overflow-scroll">
      <div className="flex-1 w-full"></div>
      <form
        onSubmit={handleSubmit}
        className="flex sticky bottom-0 space-x-2 p-5 bg-indigo-600/75">
        <Input
          placeholder="Ask a Question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          type="submit"
          disabled={!input || isPending}>
          {isPending ? <Loader2Icon className="animate-spin text-indigo-600" /> : "Ask"}
        </Button>
      </form>
    </div>
  );
}

export default Chat;
