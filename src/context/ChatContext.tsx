"use client";

import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import useWebSocket from "@/hooks/useWebSocket";
import type { Message } from "@/shared/lib/types";
import { getLogger } from "@/shared/logger.browser";

const logger = getLogger({ module: "ChatContext" });

type ChatContextType = {
	messages: Message[];
	pushMessage: (msg: Message) => void;
	popMessage: () => void;
	fileKey: string | null;
	setFileKey: (key: string | null) => void;
	initializeMessages: (initialMessages: Message[]) => void;
	removePlaceholderMessages: () => void;
	skipInitialize: boolean;
	setSkipInitialize: (val: boolean) => void;
	pushInitialMessage: (msg: Message) => void;
	pendingInitialMessages: Message[];
	setPendingInitialMessages: (msg: Message[]) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
	const context = useContext(ChatContext);
	if (!context) throw new Error("useChat must be used within a ChatProvider");
	return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
	const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";
	const [skipInitialize, setSkipInitialize] = useState(false);
	const [pendingInitialMessages, setPendingInitialMessages] = useState<
		Message[]
	>([]);
	const [wsUrl, setWsUrl] = useState<string | null>(null);

	const pushInitialMessage = (msg: Message) => {
		setPendingInitialMessages([msg]);
		setSkipInitialize(true);
	};

	const params = useParams();
	const chatId = typeof params.chatId === "string" ? params.chatId : null;

	useEffect(() => {
		if (!chatId) {
			logger.warn("ChatProvider initialized without a chatId.");
			setWsUrl(null);
			return;
		}
		fetch("/api/auth/ws-token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ chatId }),
		})
			.then((res) => res.json())
			.then(({ token }) => {
				setWsUrl(`${WS_URL}?chatroomId=${chatId}&token=${token}`);
			})
			.catch((err) => {
				logger.error("Failed to fetch WS token", err);
			});
	}, [chatId, WS_URL]);

	const {
		messages,
		pushMessage,
		popMessage,
		fileKey,
		setFileKey,
		initializeMessages,
		removePlaceholderMessages,
	} = useWebSocket(wsUrl);

	return (
		<ChatContext.Provider
			value={{
				messages,
				pushMessage,
				popMessage,
				fileKey,
				setFileKey,
				initializeMessages,
				removePlaceholderMessages,
				skipInitialize,
				setSkipInitialize,
				pushInitialMessage,
				pendingInitialMessages,
				setPendingInitialMessages,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
};
