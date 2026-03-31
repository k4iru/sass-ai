import { v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";
import { type AgentDeps, container } from "@/shared/lib/container";
import { getChatModel } from "@/shared/lib/langchain/llmFactory";
import { askQuestion } from "@/shared/lib/langchain/llmHandler";
import { parseProviderString } from "@/shared/lib/models";
import { getLogger } from "@/shared/logger";

export const parseCookies = (
	cookieHeader: string | undefined,
): {
	[key: string]: string;
} => {
	if (!cookieHeader) return {};

	return Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [key, ...v] = c.trim().split("=");
			return [key, v.join("=")];
		}),
	);
};

export const authenticateViaHttpToken = async (
	token: string,
	apiUrl: string,
): Promise<{ userId: string; chatId: string } | null> => {
	const res = await fetch(`${apiUrl}/api/auth/verify-ws-token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token }),
	});
	if (!res.ok) return null;
	return res.json();
};

// moved to helper so that we can buffer messages
export const handleMessage = async (
	ws: WebSocket,
	data: Buffer,
	userId: string,
	chatroomId: string,
): Promise<void> => {
	const logger = getLogger({ module: "handle message" });

	try {
		const text = data.toString();
		const msg = JSON.parse(text);

		// parse "provider:model" from the message to select the right LLM
		const { provider, modelId } = parseProviderString(msg.provider || "openai");
		const cache = await getChatModel(userId, provider, modelId);

		if (cache === null) {
			logger.warn("Chat model not found");
			ws.send(
				JSON.stringify({
					id: uuidv4(),
					role: "error",
					chatId: chatroomId,
					userId,
					content:
						"Unable to connect to the AI model. Please check that your API key is valid in your API Keys settings.",
					type: "error",
				}),
			);
			return;
		}
		const [model, summaryProvider] = cache;

		let streamedText = "";
		const askQuestionDeps: AgentDeps = container;
		const AiMessageId = uuidv4();

		// stream response back to client
		for await (const chunk of askQuestion(
			{ ...msg, userId },
			model,
			summaryProvider,
			askQuestionDeps,
		)) {
			if (ws.readyState !== WebSocket.OPEN) {
				logger.info("Client disconnected, aborting LLM stream.");
				break;
			}
			const tokenText = chunk.text || "";
			streamedText += tokenText;

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(
					JSON.stringify({
						id: AiMessageId,
						role: "ai",
						chatId: chatroomId,
						userId,
						content: tokenText,
						type: "token",
					}),
				);
			}
		}

		// send final done token
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(
				JSON.stringify({
					id: AiMessageId,
					role: "ai",
					chatId: chatroomId,
					userId,
					content: streamedText,
					type: "done",
				}),
			);
		}
	} catch (err) {
		logger.error("Error processing message: %o", err);
		ws.send(
			JSON.stringify({
				id: uuidv4(),
				role: "error",
				chatId: chatroomId,
				userId,
				content:
					"Something went wrong while generating a response. Please check your API key and try again.",
				type: "error",
			}),
		);
	}
};
