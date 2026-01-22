"use client";

import { use, useEffect, useRef } from "react";
import ChatMessage from "@/components/ChatMessage/ChatMessage";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import styles from "./chatid.module.scss";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

type Props = {
	params: Promise<{ chatId: string }>;
};

const ChatPage = ({ params }: Props) => {
	const bottom = useRef<HTMLSpanElement>(null);
	const chatId = use(params).chatId;
	const { user } = useAuth(); // Assuming user is provided by ChatContext or AuthContext
	const { messages, initializeMessages, skipInitialize } = useChat();

	// biome-ignore lint/correctness/useExhaustiveDependencies: need messages as a dependency to update run when new chat added
	useEffect(() => {
		if (bottom.current) {
			bottom.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	useEffect(() => {
		if (skipInitialize) return; // prevent fetch if already initialized

		const fetchMessages = async () => {
			if (!chatId || !user) return;

			try {
				const userId = user.id;
				const response = await fetch(`${ApiUrl}/api/chat/get-messages`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ userId, chatId }),
				});

				if (!response.ok) throw new Error("Failed to fetch messages");

				const data = await response.json();
				initializeMessages(data);
			} catch (error) {
				console.error("Error fetching messages:", error);
			}
		};

		fetchMessages();
	}, [chatId, user, initializeMessages, skipInitialize]);

	return (
		<>
			<ul className={styles.messageList}>
				{messages.map((msg) => (
					<li key={msg.id}>
						<ChatMessage
							role={msg.role}
							content={msg.content}
							type={msg.type}
						/>
					</li>
				))}
				<span ref={bottom} />
			</ul>
			<div className={styles.overlay} />
		</>
	);
};

export default ChatPage;
