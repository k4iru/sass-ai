import type { IncomingMessage } from "node:http";
import { createServer } from "node:http";
import { parse } from "node:url";
import { type WebSocket, WebSocketServer } from "ws";
import { authenticateViaHttpToken, handleMessage } from "@/server/lib/util";
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

	// constants
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

	// helper function to handle incoming messages from clients

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

		// bSuffer messages that arrive before auth completes
		const preAuthQueue: Buffer[] = [];
		let authenticated = false;

		ws.on("message", (data) => {
			if (!authenticated) {
				preAuthQueue.push(data as Buffer);
			} else {
				handleMessage(ws, data as Buffer, userId, chatroomId);
			}
		});

		const authResult = await authenticateViaHttpToken(token, apiUrl);
		if (!authResult) {
			ws.close(1008, "Unauthorized");
			logger.warn("Unauthorized connection attempt with token: %s", token);
			return;
		}


		const { userId } = authResult;
		authenticated = true;

		// chatroom already exists.
		if (chatRooms[chatroomId]) {
			logger.info(`Replacing existing WebSocket for chatroom: ${chatroomId}`);
			chatRooms[chatroomId].close();
		}
		chatRooms[chatroomId] = ws;

		// Drain any messages that arrived during auth
		for (const data of preAuthQueue) {
			handleMessage(ws, data, userId, chatroomId);
		}

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
