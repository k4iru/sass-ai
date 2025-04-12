import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import pg from "pg";
const { Pool, Client } = pg;
import * as schema from "./schema";

config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a dedicated client for LISTEN/NOTIFY
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool }); // drizzle for updating / deleting / inserting data
export { schema, client }; // client for LISTEN/NOTIFY
