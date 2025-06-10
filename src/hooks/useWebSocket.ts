import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/types/types";

let socket: WebSocket | null = null;

function useWebSocket(url: string | null) {
	const [messages, setMessages] = useState<Message[]>([]);

	useEffect(() => {
		// skip
		if (!url) {
			console.log("No URL provided for WebSocket connection.");
			return;
		}

		if (!socket) {
			console.log("Connecting to WebSocket at:", url);
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
		// need to also push message to server
		//setMessages((prev) => [...prev, message]);
		fetch("/api/auth/push-message", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(message),
		});
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
