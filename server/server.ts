import { WebSocketServer, WebSocket } from "ws";
import { client } from "../src/db/index";
import { config } from "dotenv";
import { parse } from "node:url";
import { insertMessage } from "@/lib/helper";
// import { askQuestion } from "@/lib/langchain";
import { askQuestion } from "@/lib/langchain/llmHandler";
import { getChatModel } from "@/lib/langchain/llmFactory";
import type { Message } from "@/types/types";
import { v4 as uuidv4 } from "uuid";

import type { Notification } from "pg";

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

// Subscribe to PostgreSQL notifications
async function listenForMessages(): Promise<void> {
	await client.connect();
	await client.query("LISTEN new_message");

	// postgres client on notification
	client.on("notification", (msg: Notification) => {
		try {
			if (!msg.payload) {
				console.error("No payload in notification message");
				return;
			}
			const newMessage = JSON.parse(msg.payload);
			console.log("📬 New message received:", newMessage);

			// look up chat room dictionary
			const chatRoom: WebSocket = chatRooms[newMessage.chat_id];
			if (chatRoom && chatRoom.readyState === chatRoom.OPEN) {
				chatRoom.send(JSON.stringify(newMessage));
			}
		} catch (err) {
			console.error("Error parsing message payload:", err);
		}
	});

	client.on("error", (err: unknown) => {
		console.error(
			"PostgreSQL LISTEN error:",
			err instanceof Error ? err.message : err,
		);
	});
}

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

				if (!msg.firstMessage) {
					// not first message is pushed along with chatroom in api call.
					insertMessage(msg);
				}

				const chatModel = await getChatModel(
					msg.userId,
					msg.provider ? msg.provider : "openai",
				);

				console.log("I am model", chatModel);

				if (!chatModel) {
					console.log("chat model not found");
					ws.send(JSON.stringify({ error: "chat model not found" }));
					return;
				}

				let streamedText = "";

				const AiMessageId = uuidv4();
				for await (const chunkk of askQuestion(msg, chatModel)) {
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

					// insert into db
					insertMessage({
						id: AiMessageId,
						role: "ai",
						chatId: msg.chatId,
						userId: msg.userId,
						content: streamedText,
						createdAt: new Date(),
					});
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
