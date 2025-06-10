// contexts/ChatContext.tsx
"use client";

import { useEffect } from "react";
import { createContext, useContext } from "react";
import { useParams } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";
import type { Message } from "@/types/types";

type ChatContextType = {
	messages: Message[];
	pushMessage: (msg: Message) => void;
	popMessage: () => void;
	initializeMessages: (initialMessages: Message[]) => void;
	removePlaceholderMessages: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
	const context = useContext(ChatContext);
	if (!context) throw new Error("useChat must be used within a ChatProvider");
	return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
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
				initializeMessages,
				removePlaceholderMessages,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
};
