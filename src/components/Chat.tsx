"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";
import { Message } from "@/types/types";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function Chat({ fileKey }: { fileKey: string }) {
  const { messages, popMessage, pushMessage, initializeMessages } = useWebSocket(`ws://localhost:8080?chatroomId=${fileKey}`); // Replace with actual WebSocket URL
  const { user } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // TODO also have the user load previous messages from the server
    const fetchMessages = async () => {
      if (!user || !fileKey) throw new Error("User or fileKey is not defined");
      const resp = await fetch(`${ApiUrl}/api/auth/get-messages`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ userId: user.id, chatId: fileKey }),
      });

      const data = await resp.json();

      console.log(data);

      // empty chat room
      if (data.length === 0) {
        createChatRoom();
      }

      initializeMessages(data);
    };

    const createChatRoom = async () => {
      const userId = user?.id;
      await fetch(`${ApiUrl}/api/auth/create-chatroom`, {
        method: "POST",
        credentials: "include", // Include cookies in the request
        body: JSON.stringify({ userId: userId, chatId: fileKey }),
      });
    };

    if (user) {
      fetchMessages();
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input;
    setInput("");

    if (!user || !fileKey) {
      throw new Error("User or fileKey is not defined");
    }
    // send message to server.
    // should also append to messages array, then pop message oncen response is receive

    let newMessageHuman: Message = {
      role: "human",
      chatId: fileKey,
      userId: user?.id,
      content: q,
      createdAt: new Date(),
    };

    let placeHolderMessage: Message = {
      role: "placeholder",
      chatId: fileKey,
      userId: user?.id,
      content: "Thinking...",
      createdAt: new Date(),
    };
    pushMessage(newMessageHuman);
    pushMessage(placeHolderMessage);

    /* PUSHED TO ARRAY now send to server for processing then pop both when message received*/

    startTransition(async () => {
      //const { success, message } = await askQuestion(fileKey, q);
      const { success, message } = { success: true, message: "Hello World!" }; // Mock response for testing

      // if (!success) {
      //   setMessages((prev) =>
      //     prev.slice(0, prev.length - 1).concat([
      //       {
      //         role: "ai",
      //         message: `Whoops... ${message}`,
      //         createdAt: new Date(),
      //       },
      //     ])
      //   );
      // }
    });
  };

  if (!user) {
    <div>Please log in to chat.</div>;
    return router.push("/login");
  }
  return (
    <div className="flex flex-col h-full overflow-scroll">
      <div className="flex-1 w-full">
        <ul>
          {messages.map((msg, i) => (
            <li key={i}>{msg.content}</li>
          ))}
        </ul>
      </div>
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
