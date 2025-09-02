"use client";

import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import useWebSocket from "@/hooks/useWebSocket";
import type { Message } from "@/lib/types";

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
	const [skipInitialize, setSkipInitialize] = useState(false);
	const [pendingInitialMessages, setPendingInitialMessages] = useState<
		Message[]
	>([]);

	const pushInitialMessage = (msg: Message) => {
		setPendingInitialMessages([msg]);
		setSkipInitialize(true);
	};

	const params = useParams();
	const chatId = typeof params.chatId === "string" ? params.chatId : null;

	useEffect(() => {
		if (!chatId) {
			console.warn("ChatProvider initialized without a chatId.");
		}
	}, [chatId]);

	const {
		messages,
		pushMessage,
		popMessage,
		fileKey,
		setFileKey,
		initializeMessages,
		removePlaceholderMessages,
	} = useWebSocket(
		chatId ? `${process.env.NEXT_PUBLIC_WS_URL}?chatroomId=${chatId}` : null, // no connection if no chatId
	);

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
