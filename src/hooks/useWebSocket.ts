import React, { useEffect, useState } from "react";

export type Message = {
  id: number;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

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

  return { messages };
}

export default useWebSocket;
