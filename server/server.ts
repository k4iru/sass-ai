import { WebSocketServer, WebSocket } from "ws";
import { config } from "dotenv";
import { parse } from "node:url";
import { askQuestion } from "@/lib/langchain/llmHandler";
import { getChatModel } from "@/lib/langchain/llmFactory";
import { v4 as uuidv4 } from "uuid";

type ChatRooms = {
	[key: string]: WebSocket;
};

const chatRooms: ChatRooms = {};

// Load env based on environment
const envFilePath =
	process.env.NODE_ENV === "production"
		? ".env.production.local"
		: ".env.local";
config({ path: envFilePath });

// Start WebSocket server
export function startWebSocketServer(): void {
	console.log("🟢 Starting Web Socket Server");
	const port = Number(process.env.WS_PORT) || 8080;
	const wss = new WebSocketServer({ port });

	wss.on("connection", (ws: WebSocket, req) => {
		console.log("🟢 New client connected");
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

				const AiMessageId = uuidv4();
				for await (const chunkk of askQuestion(msg, model, summaryProvider)) {
					const token = chunkk.text || "";
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

	console.log(`🚀 WebSocket server running on wss://localhost: ${port}`);
}

startWebSocketServer();
