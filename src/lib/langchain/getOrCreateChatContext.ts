import type { AgentDeps, Message } from "@/lib/types";

export async function getOrCreateChatContext(
	deps: AgentDeps,
	message: Message,
) {
	const { userId, chatId } = message;
	const { chatContextManager, createChatContext } = deps;

	let chatContext = chatContextManager.getChatContext(userId, chatId);

	if (!chatContext) {
		chatContext = await createChatContext(message);
	} else {
		while (
			chatContext.messages.length > 0 &&
			chatContext.messages[0].messageOrder <= chatContext.lastSummaryIndex
		) {
			chatContext.messages.shift();
		}
	}

	chatContextManager.setChatContext(userId, chatId, chatContext);
	return chatContext;
}
