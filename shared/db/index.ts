import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/shared/db/schema";

// 1. Remove dotenv.config() - Next.js does this for you.
const { Pool } = pg;

// 2. Wrap the initialization in a global variable to prevent multiple connections
// but also to prevent immediate execution during the build scan.
const globalForDb = global as unknown as { pool: pg.Pool | undefined };

const isProduction = process.env.NODE_ENV === "production";

export const pool =
	globalForDb.pool ??
	new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl: isProduction ? { rejectUnauthorized: false } : undefined,
	});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
