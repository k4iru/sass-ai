import { WebSocketServer, type WebSocket } from "ws";
import { client } from "../src/db/index";
import { config } from "dotenv";
import { parse } from "node:url";
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

		ws.on("close", () => {
			console.log("🔴 Client disconnected");
			delete chatRooms[chatroomId];
		});
	});

	console.log(`🚀 WebSocket server running on ws://localhost: ${port}`);
	listenForMessages();
}

startWebSocketServer();
