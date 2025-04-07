import React, { useEffect, useState } from "react";

export type Message = {
  id: number;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

function useWebSocket(url: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    setWs(socket);

    socket.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, newMessage]);
    };

    socket.onclose = () => {
      console.log("WebSocket closed.");
      return () => socket.close();
    };
  }, [url]);
  return { messages };
}

export default useWebSocket;
