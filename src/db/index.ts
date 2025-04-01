import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Pool, Client } from "pg";
import * as schema from "./schema";

config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a dedicated client for LISTEN/NOTIFY
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect().then(() => {
  console.log("Connected to PostgreSQL for LISTEN/NOTIFY");
});

// Listen for PostgreSQL NOTIFY events
client.query("LISTEN new_message");

client.on("notification", (msg) => {
  console.log("New message notification received:", msg.payload);
  // You will need to broadcast this update via WebSockets
});

export const db = drizzle({ client: pool }); // drizzle for updating / deleting / inserting data
export { schema, client }; // client for LISTEN/NOTIFY
