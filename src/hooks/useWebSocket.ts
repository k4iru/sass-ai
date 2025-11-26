import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/shared/lib/types";

function useWebSocket(url: string | null) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [fileKey, setFileKey] = useState<null | string>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const pendingQueueRef = useRef<Message[]>([]);

	useEffect(() => {
		// skip
		if (!url) {
			console.log("No URL provided for WebSocket connection.");
			return;
		}

		const socket = new WebSocket(url);
		socketRef.current = socket;

		// on connenct flush all message
		socket.onopen = () => {
			for (const msg of pendingQueueRef.current) {
				socket.send(JSON.stringify(msg));
			}

			pendingQueueRef.current = [];
		};

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);

			// stream aware
			setMessages((prev) => {
				const updatedMessages = [...prev];

				// pushes to react client side message list
				if (data.type === "token") {
					// copy previous messages
					const lastMessage = updatedMessages[updatedMessages.length - 1];

					if (lastMessage?.id === data.id) {
						// Make a new object so React sees a change
						const updatedStreamingMessage = {
							...lastMessage,
							content: lastMessage.content + data.content,
						};
						updatedMessages[updatedMessages.length - 1] =
							updatedStreamingMessage;
					} else {
						updatedMessages.push({
							id: data.id,
							role: "ai",
							chatId: data.chatId,
							userId: data.userId,
							content: data.content,
							provider: data.provider,
							createdAt: new Date(),
							messageOrder: data.messageOrder,
						});
					}
				}

				return updatedMessages;
			});
		};

		socket.onclose = () => {
			setFileKey(null);
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
		setMessages((prev) => [...prev, message]);

		if (socketRef.current?.readyState === WebSocket.OPEN) {
			console.log("sending through websocket");
			socketRef.current.send(JSON.stringify(message));
		} else {
			//
			console.log("websocket not currently open. adding to queue");
			pendingQueueRef.current.push(message);
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
		fileKey,
		setFileKey,
		popMessage,
		initializeMessages,
		removePlaceholderMessages,
	};
}

export default useWebSocket;
