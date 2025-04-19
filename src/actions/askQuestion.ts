"use server";

import { useAuth } from "@/context/AuthContext";
import { authenticate } from "@/lib/auth";
import type { Message } from "@/types/types";
import { insertMessage } from "@/lib/helper";

const FREE_LIMT = 3;
const PRO_LIMIT = 100;

// implemented as server action
export async function askQuestion(message: Message) {
	// verify user authentication from cookies
	authenticate();
	const { user } = useAuth();

	if (!user) {
		throw new Error("User not authenticated");
	}

	// generate AI reply
	const reply = await generateLangchainCompletion(message.content);

	const aiMessage: Message = {
		role: "ai",
		chatId: message.chatId,
		userId: message.userId,
		content: reply,
		createdAt: new Date(),
	};

	// insert into db
	const success = await insertMessage(aiMessage);

	if (success) {
		return { success: true, message: null };
	}

	// send message to api for response and insert into db
}
