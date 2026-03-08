import type { IncomingMessage } from "node:http";
import { createServer } from "node:http";
import { parse } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { getJwtConfig } from "@/server/lib/jwtConfig";
import { authenticateWebSocket } from "@/server/lib/util";
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

// websocket authentication flow:
// on connection, check for cookies in the upgrade request. if no cookies, reject connection
// if cookies, validate access token. if valid, accept connection. if invalid, check refresh token
// if refresh token is valid, issue new access token and accept connection. if refresh token is invalid, reject connection
async function startWebSocketServer2(): Promise<void> {
	console.log("starting websocket server rebuild");

	// set port from environment. PORT is used by railway
	const port = Number(process.env.PORT) || Number(process.env.WS_PORT) || 8080;

	// Create HTTP server to handle health checks for railway.
	const server = createServer((req, res) => {
		const { pathname } = parse(req.url || "/", true);

		if (pathname === "/health" || pathname === "/healthz") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("ok");
			return;
		}

		// Default 404 for any other HTTP GET requests
		res.writeHead(404);
		res.end();
	});

	// bind a websocket server to the http server
	const wss = new WebSocketServer({ server });

	// events
	wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
		console.log("new client connected");

		const authenticated = await authenticateWebSocket(req);

		if (!authenticated) {
			ws.close(1008, "Unauthorized");
			return;
		}

		// do stuff with connection
		// authenticate httponly cookie here before upgrade
		const query = parse(req.url || "", true).query;
		const chatroomId = query.chatroomId as string;
	});

	// listen on specified port
	server.listen(port, "0.0.0.0", () => {
		console.log(`Server listening on http://0.0.0.0:${port}`);
		console.log(`Health check available at http://0.0.0.0:${port}/health`);
		console.log(`WebSocket endpoint available at ws://localhost:${port}`);
	});
}

// Start WebSocket server
export function startWebSocketServer(): void {
	console.log("Starting Web Socket Server");
	const port = Number(process.env.PORT) || Number(process.env.WS_PORT) || 8080;

	// Create HTTP server to handle health checks
	const server = createServer((req, res) => {
		const { pathname } = parse(req.url || "/", true);

		if (pathname === "/health" || pathname === "/healthz") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("ok");
			return;
		}

		// Default 404 for any other HTTP GET requests
		res.writeHead(404);
		res.end();
	});

	const wss = new WebSocketServer({ server });
	wss.on("connection", (ws: WebSocket, req) => {
		console.log("New client connected");

		// read cookies for access token and refresh token.
		// edge case where refresh token is valid but access token is expired should be handled client side by calling refresh endpoint
		// then retry connection if needed
		// will need to pull jwt decryption and validation into a shared lib folder later

		const query = parse(req.url || "", true).query;
		const chatroomId = query.chatroomId as string;

		if (!chatroomId) {
			ws.close(1008, "Chatroom ID is required");
			return;
		}

		// Overwrite any existing WebSocket for the chatroom
		if (chatRooms[chatroomId]) {
			console.log(`Replacing existing WebSocket for chatroom: ${chatroomId}`);
			chatRooms[chatroomId].close(); // Close the old connection
		}
		chatRooms[chatroomId] = ws;

		ws.on("message", async (data) => {
			// on message, send message to postgresql.
			// then run langchain to process the message
			try {
				console.log("trying to insert message");
				const text = data.toString();
				const msg = JSON.parse(text);

				// TODO Set up other providers later. for now default to OpenAi
				const cache = await getChatModel(msg.userId, "openai");

				if (cache === null) {
					console.log("chat model not found");
					ws.send(JSON.stringify({ error: "chat model not found" }));
					return;
				}
				const [model, summaryProvider] = cache;

				let streamedText = "";

				const askQuestionDeps: AgentDeps = container;

				const AiMessageId = uuidv4();
				for await (const chunk of askQuestion(
					msg,
					model,
					summaryProvider,
					askQuestionDeps,
				)) {
					if (ws.readyState !== WebSocket.OPEN) {
						console.log("Client disconnected, aborting LLM stream.");
						break;
					}
					const token = chunk.text || "";
					streamedText += token;

					if (ws.readyState === WebSocket.OPEN) {
						ws.send(
							JSON.stringify({
								id: AiMessageId,
								role: "ai",
								chatId: msg.chatId,
								userId: msg.userId,
								content: token,
								type: "token",
							}),
						);
					}
				}

				// send final messages
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(
						JSON.stringify({
							id: AiMessageId,
							role: "ai",
							chatId: msg.chatId,
							userId: msg.userId,
							content: streamedText,
							type: "done",
						}),
					);
				}
			} catch (err) {
				console.error("Error parsing message:", err);
				ws.send(JSON.stringify({ error: "Invalid message format" }));
			}
		});

		ws.on("close", () => {
			console.log("🔴 Client disconnected");
			delete chatRooms[chatroomId];
		});
	});

	server.listen(port, "0.0.0.0", () => {
		console.log(`Server listening on http://0.0.0.0:${port}`);
		console.log(`Health check available at http://0.0.0.0:${port}/health`);
		console.log(`WebSocket endpoint available at ws://localhost:${port}`);
	});
}

startWebSocketServer2();
