"use server";

import { authenticate } from "@/lib/auth";
import type { Message } from "@/lib/types";
import { insertMessage } from "@/lib/helper";
import { generateLangchainCompletion } from "@/lib/langchain";

const FREE_LIMT = 3;
const PRO_LIMIT = 100;

// implemented as server action
export async function askQuestion(message: Message) {
	// verify user authentication from cookies
	try {
		authenticate();
	} catch (err) {
		return { success: false, message: "Unauthorized" };
	}

	// generate AI reply
	const reply = await generateLangchainCompletion(
		message.userId,
		message.chatId,
		message.content,
	);

	if (reply == null) {
		return { success: false, message: "Error generating reply" };
	}

	const aiMessage: Message = {
		role: "ai",
		chatId: message.chatId,
		userId: message.userId,
		content: reply,
		createdAt: new Date(),
	};

	// insert into db
	const success = await insertMessage(aiMessage);

	if (!success) {
		return { success: false, message: "unsuccessful" };
	}

	return { success: true, message: null }; // return success message
}
