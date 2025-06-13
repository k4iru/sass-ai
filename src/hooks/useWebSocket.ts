import { useCallback, useEffect, useState, useRef } from "react";
import type { Message } from "@/types/types";
const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function useWebSocket(url: string | null) {
	const [messages, setMessages] = useState<Message[]>([]);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		// skip
		if (!url) {
			console.log("No URL provided for WebSocket connection.");
			return;
		}

		const socket = new WebSocket(url);
		socketRef.current = socket;

		socket.onmessage = (event) => {
			const newMessage = JSON.parse(event.data);
			setMessages((prev) => [...prev, newMessage]);
		};

		socket.onclose = () => {
			console.log("WebSocket closed.");
		};

		return () => {
			if (socket) {
				socket.close();
				socketRef.current = null;
			}
		};
	}, [url]);

	const pushMessage = (message: Message): void => {
		// if on specific chatId, then send the message via WebSocket for real-time updates
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			// send via WebSocket
			socketRef.current.send(JSON.stringify(message));
		} else {
			fetch(`${ApiUrl}/api/chat/push-message`, {
				method: "POST",
				credentials: "include", // Include cookies in the request
				body: JSON.stringify(message),
			});
			// in the case the WebSocket is not open, we can still update the local state
			console.warn("WebSocket is not open. Cannot push message.");
		}
	};

	const popMessage = (): void => {
		setMessages((prev) => prev.slice(0, -1));
	};

	// memoize to avoid rerenders
	const initializeMessages = useCallback((initialMessages: Message[]) => {
		setMessages(initialMessages);
	}, []);

	const removePlaceholderMessages = (): void => {
		setMessages((prev) =>
			prev.filter((message) => !message.role.includes("placeholder")),
		);
	};

	return {
		messages,
		pushMessage,
		popMessage,
		initializeMessages,
		removePlaceholderMessages,
	};
}

export default useWebSocket;
