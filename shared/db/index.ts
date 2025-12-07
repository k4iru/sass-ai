import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/shared/db/schema";

const { Pool } = pg;
const isProduction =
	process.env.NODE_ENV === "production" ||
	process.env.RUN_SEED_SCRIPT === "true";

config({ path: ".env.local" });

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle({ client: pool }); // drizzle for updating / deleting / inserting data
export { schema }; // client for LISTEN/NOTIFY
