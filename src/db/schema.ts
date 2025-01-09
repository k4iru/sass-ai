import { timestamp, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool });

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
});

export const tokensTable = pgTable("tokens", {
  id: varchar({ length: 255 }).primaryKey(),
  userId: integer().notNull(),
  refreshToken: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().defaultNow(),
});
