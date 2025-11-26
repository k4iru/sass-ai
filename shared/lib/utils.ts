import {
	AIMessage,
	type BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/shared/db";
import type { MessageHistory } from "@/shared/lib/types";

export function convertToBaseMessageArray(
	messages: MessageHistory[],
): BaseMessage[] {
	const baseMessages = messages.map((msg) => {
		if (msg.role === "human") {
			return new HumanMessage(msg.content);
		}
		if (msg.role === "ai") {
			return new AIMessage(msg.content);
		}
		return new SystemMessage(msg.content);
	});

	return baseMessages;
}

export async function updateSummary(
	userId: string,
	chatId: string,
	summary: string,
	lastSummaryIndex: number,
): Promise<boolean> {
	try {
		await db
			.update(schema.summaries)
			.set({ summary: summary, lastIndex: lastSummaryIndex - 1 })
			.where(
				and(
					eq(schema.summaries.chatId, chatId),
					eq(schema.summaries.userId, userId),
				),
			);
	} catch (error) {
		console.log(error);
		return false;
	}
	return true;
}
