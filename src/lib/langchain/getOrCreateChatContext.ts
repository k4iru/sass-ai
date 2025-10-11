import type { ChatContext, ChatContextManager, Message } from "@/lib/types";

export interface ChatContextDeps {
	createChatContext(message: Message): Promise<ChatContext>;
	manager: ChatContextManager;
}

export async function getOrCreateChatContext(
	message: Message,
	deps: ChatContextDeps,
): Promise<ChatContext> {
	const { userId, chatId } = message;

	const { manager, createChatContext } = deps;

	let chatContext = manager.getChatContext(userId, chatId);

	if (!chatContext) {
		// { messages: context, totalTokens: contextTokens, summary: summary, lastSummaryIndex: lastIndex }
		chatContext = await createChatContext(message);
		manager.setChatContext(userId, chatId, chatContext);
	} else {
		console.log(`Using cached chat context for ${userId}-${chatId}`);

		if (chatContext.messages.length > 0 && chatContext.lastSummaryIndex > 0) {
			while (
				chatContext.messages.length > 0 &&
				chatContext.messages[0].messageOrder <= chatContext.lastSummaryIndex
			)
				chatContext.messages.shift();
		}

		manager.setChatContext(userId, chatId, chatContext);
	}

	manager.setChatContext(userId, chatId, chatContext);
	return chatContext;
}
