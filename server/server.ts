import { WebSocketServer, WebSocket } from "ws";
import { client } from "@/db/index";
import { config } from "dotenv";

const clients = new Set<WebSocket>();

// Load env based on environment
const envFilePath = process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.local";
config({ path: envFilePath });

// Subscribe to PostgreSQL notifications
async function listenForMessages(): Promise<void> {
  await client.connect();
  await client.query("LISTEN new_message");

  client.on("notification", (msg: any) => {
    try {
      const newMessage = JSON.parse(msg.payload);
      console.log("📬 New message received:", newMessage);

      clients.forEach((ws: WebSocket) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(newMessage));
        }
      });
    } catch (err) {
      console.error("Error parsing message payload:", err);
    }
  });

  client.on("error", (err: unknown) => {
    console.error("PostgreSQL LISTEN error:", err instanceof Error ? err.message : err);
  });
}

// Start WebSocket server
export function startWebSocketServer(): void {
  console.log("🟢 Starting Web Socket Server");
  const port = Number(process.env.WS_PORT) || 8080;
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket) => {
    console.log("🟢 New client connected");
    clients.add(ws);

    ws.on("close", () => {
      console.log("🔴 Client disconnected");
      clients.delete(ws);
    });
  });

  console.log("🚀 WebSocket server running on ws://localhost:" + port);
  listenForMessages();
}

startWebSocketServer();
