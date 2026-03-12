import type { IncomingMessage } from "node:http";
import { createServer } from "node:http";
import { parse } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { authenticateViaHttpToken } from "@/server/lib/util";
import { type AgentDeps, container } from "@/shared/lib/container";
import { getChatModel } from "@/shared/lib/langchain/llmFactory";
import { askQuestion } from "@/shared/lib/langchain/llmHandler";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "webSocketServer" });
type ChatRooms = {
	[key: string]: WebSocket;
};

// in memory list of chatrooms. For now probably only using a single server instance,
// but for scaling this can be moved to redis etc
const chatRooms: ChatRooms = {};

async function startWebSocketServer(): Promise<void> {
	logger.info("Starting WebSocket server (v2)");

	const port = Number(process.env.PORT) || Number(process.env.WS_PORT) || 8080;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

	// this is for railway so it can perform health checks
	const server = createServer((req, res) => {
		const { pathname } = parse(req.url || "/", true);

		if (pathname === "/health" || pathname === "/healthz") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("ok");
			return;
		}

		res.writeHead(404);
		res.end();
	});

	// instantiate the web socket server on top of the existing http server
	const wss = new WebSocketServer({ server });

	wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
		logger.info("New client connected");

		const query = parse(req.url || "", true).query;
		const chatroomId = query.chatroomId as string;
		const token = query.token as string;

		if (!chatroomId || !token) {
			logger.warn("Connection attempt missing chatroomId or token");
			ws.close(1008, "chatroomId and token are required");
			return;
		}

		console.log("test 1");
		const authResult = await authenticateViaHttpToken(token, apiUrl);
		if (!authResult) {
			ws.close(1008, "Unauthorized");
			logger.warn("Unauthorized connection attempt with token: %s", token);
			console.log("test 2");
			return;
		}

		console.log("test 3");

		const { userId } = authResult;

		if (chatRooms[chatroomId]) {
			logger.info(`Replacing existing WebSocket for chatroom: ${chatroomId}`);
			chatRooms[chatroomId].close();
		}
		chatRooms[chatroomId] = ws;

		ws.on("message", async (data) => {
			try {
				const text = data.toString();
				const msg = JSON.parse(text);

				const cache = await getChatModel(userId, "openai");

				if (cache === null) {
					logger.warn("Chat model not found");
					ws.send(JSON.stringify({ error: "chat model not found" }));
					return;
				}
				const [model, summaryProvider] = cache;

				let streamedText = "";
				const askQuestionDeps: AgentDeps = container;
				const AiMessageId = uuidv4();

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
								chatId: msg.chatId,
								userId,
								content: tokenText,
								type: "token",
							}),
						);
					}
				}

				if (ws.readyState === WebSocket.OPEN) {
					ws.send(
						JSON.stringify({
							id: AiMessageId,
							role: "ai",
							chatId: msg.chatId,
							userId,
							content: streamedText,
							type: "done",
						}),
					);
				}
			} catch (err) {
				logger.error("Error processing message: %o", err);
				ws.send(JSON.stringify({ error: "Invalid message format" }));
			}
		});

		ws.on("close", () => {
			logger.info("Client disconnected");
			delete chatRooms[chatroomId];
		});
	});

	server.listen(port, "0.0.0.0", () => {
		logger.info(`Server listening on http://0.0.0.0:${port}`);
		logger.info(`Health check available at http://0.0.0.0:${port}/health`);
		logger.info(`WebSocket endpoint available at ws://localhost:${port}`);
	});
}

startWebSocketServer();
