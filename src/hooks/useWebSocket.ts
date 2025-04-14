import React, { useEffect, useState } from "react";
import { Message } from "@/types/Messages";

let socket: WebSocket | null = null;

function useWebSocket(url: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket) {
      socket = new WebSocket(url);

      socket.onmessage = (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMessage]);
      };

      socket.onclose = () => {
        console.log("WebSocket closed.");
        socket = null; // Reset the socket
      };
    }

    return () => {
      if (socket) {
        socket.close();
        socket = null; // Reset the socket on cleanup
      }
    };
  }, [url]);

  const pushMessage = (message: Message): void => {
    // UseEffect first parameter is prev messages
    setMessages((prev) => [...prev, message]);
  };

  const popMessage = (): void => {
    setMessages((prev) => prev.slice(0, -1));
  };

  return { messages, pushMessage, popMessage };
}

export default useWebSocket;
