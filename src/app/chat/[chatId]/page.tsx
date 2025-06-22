"use client";

import { useChat } from "@/context/ChatContext";
import { useEffect, useRef } from "react";
import { use } from "react";
import { useAuth } from "@/context/AuthContext";
import ChatMessage from "@/components/ChatMessage/ChatMessage";
import styles from "./chatid.module.scss";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

type Props = {
	params: Promise<{ chatId: string }>;
};

const ChatPage = ({ params }: Props) => {
	const bottom = useRef<HTMLSpanElement>(null);
	const chatId = use(params).chatId;
	const { user } = useAuth(); // Assuming user is provided by ChatContext or AuthContext
	const {
		messages,
		pushMessage,
		popMessage,
		initializeMessages,
		removePlaceholderMessages,
	} = useChat();

	// biome-ignore lint/correctness/useExhaustiveDependencies: need messages as a dependency to update run when new chat added
	useEffect(() => {
		if (bottom.current) {
			bottom.current.scrollIntoView({ behavior: "smooth" });
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]);

	useEffect(() => {
		console.log("loading chatroom messages");

		const fetchMessages = async () => {
			console.log("Fetching messages for chatId:", chatId);
			if (!chatId || !user) {
				console.warn("No chatId provided, cannot fetch messages.");
				return;
			}

			try {
				const userId = user.id;
				const response = await fetch(`${ApiUrl}/api/chat/get-messages`, {
					method: "POST",
					credentials: "include", // Include cookies in the request
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ userId, chatId }),
				});

				if (!response.ok) {
					throw new Error("Failed to fetch messages");
				}

				const data = await response.json();
				initializeMessages(data);
			} catch (error) {
				console.error("Error fetching messages:", error);
			}
		};
		fetchMessages();
	}, [chatId, initializeMessages, user]);

	return (
		<>
			<ul className={styles.messageList}>
				{messages.map((msg, idx) => (
					<li key={msg.id}>
						<ChatMessage role={msg.role} content={msg.content} />
					</li>
				))}
				<span ref={bottom} />
			</ul>
			<div className={styles.overlay} />
		</>
	);
};

export default ChatPage;
