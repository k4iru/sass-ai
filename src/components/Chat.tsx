"use client";

import {
	type FormEvent,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";
import type { Message } from "@/types/types";
import { askQuestion } from "@/actions/askQuestion";
import ChatMessage from "@/components/ChatMessage/ChatMessage";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function Chat({ fileId }: { fileId: string }) {
	const {
		messages,
		popMessage,
		pushMessage,
		initializeMessages,
		removePlaceholderMessages,
	} = useWebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?chatroomId=${fileId}`); // Replace with actual WebSocket URL
	const { user } = useAuth();
	const router = useRouter();
	const [input, setInput] = useState<string>("");
	const [isPending, startTransition] = useTransition();
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// TODO also have the user load previous messages from the server
		const fetchMessages = async () => {
			if (!user || !fileId) throw new Error("User or fileKey is not defined");
			const resp = await fetch(`${ApiUrl}/api/chat/get-messages`, {
				method: "POST",
				credentials: "include",
				body: JSON.stringify({ userId: user.id, chatId: fileId }),
			});

			const data = await resp.json();

			// empty chat room
			if (data.length === 0) {
				createChatRoom();
			}

			initializeMessages(data);
		};

		const createChatRoom = async () => {
			const userId = user?.id;
			await fetch(`${ApiUrl}/api/auth/create-chatroom`, {
				method: "POST",
				credentials: "include", // Include cookies in the request
				body: JSON.stringify({ userId: userId, chatId: fileId }),
			});
		};

		if (user) {
			fetchMessages();
		}

		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [user, fileId, initializeMessages]);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const q = input;
		setInput("");

		// send message to server.
		// should also append to messages array, then pop message oncen response is receive

		const newMessageHuman: Message = {
			role: "human",
			chatId: fileId,
			userId: user?.id || "",
			content: q,
			createdAt: new Date(),
		};

		const placeHolderMessage: Message = {
			role: "placeholder",
			chatId: fileId,
			userId: user?.id || "",
			content: "Thinking...",
			createdAt: new Date(),
		};
		pushMessage(newMessageHuman);
		pushMessage(placeHolderMessage);

		/* PUSHED TO ARRAY now send to server for processing then pop both when message received*/

		startTransition(async () => {
			// const fileKey = `${user?.id}/${fileId}`;
			const { success, message } = await askQuestion(newMessageHuman);

			if (!success) {
				// pop placeholder message and replace with error message
				popMessage();

				const errorMessage: Message = {
					role: "ai",
					chatId: fileId,
					userId: user?.id || "",
					content: `error processing message: ${message}`,
					createdAt: new Date(),
				};

				pushMessage(errorMessage);
			}

			removePlaceholderMessages();
		});
	};

	if (!user || !fileId) {
		<div>Please log in to chat.</div>;
		router.push("/login");
		return null;
	}
	return (
		<div className="flex flex-col h-full overflow-scroll">
			<div className="flex-1 w-full">
				<ul>
					{messages.map((msg, i) => (
						<ChatMessage
							key={`${i}-${msg.chatId}`}
							role={msg.role}
							content={msg.content}
						/>
					))}
					<div ref={bottomRef} />
				</ul>
			</div>
			<form
				onSubmit={handleSubmit}
				className="flex sticky bottom-0 space-x-2 p-5 bg-indigo-600/75"
			>
				<Input
					placeholder="Ask a Question..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
				/>
				<Button type="submit" disabled={!input || isPending}>
					{isPending ? (
						<Loader2Icon className="animate-spin text-indigo-600" />
					) : (
						"Ask"
					)}
				</Button>
			</form>
		</div>
	);
}

export default Chat;
