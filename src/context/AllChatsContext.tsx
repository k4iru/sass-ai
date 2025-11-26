"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import type { Chat } from "@/shared/lib/types";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

type AllChatsContextType = {
	chats: Chat[];
	refreshChats: () => void;
};

const AllChatsContext = createContext<AllChatsContextType | undefined>(
	undefined,
);

export const useAllChatsContext = (): AllChatsContextType => {
	const context = useContext(AllChatsContext);
	if (!context) {
		throw new Error("useAllChatsContext must be used within AllChatsProvider");
	}
	return context;
};

export const AllChatsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { user, loading } = useAuth();
	const [chats, setChats] = useState<Chat[]>([]);

	const refreshChats = useCallback(async () => {
		try {
			// fetch chats from api
			const response = await fetch(`${ApiUrl}/api/chat/get-all-chats`, {
				method: "POST",
				credentials: "include", // Include cookies in the request
				body: JSON.stringify({
					userId: user?.id,
				}),
			});

			const data = await response.json();
			console.log("Fetched chats:", data);
			setChats(data.chats); // Clear chats before fetching new ones
		} catch (err) {
			console.error(
				`Error fetching chats: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	}, [user]);

	useEffect(() => {
		if (!loading) {
			refreshChats();
		}
	}, [refreshChats, loading]);

	return (
		<AllChatsContext.Provider value={{ chats, refreshChats }}>
			{children}
		</AllChatsContext.Provider>
	);
};
