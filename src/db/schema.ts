import { timestamp, pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm"; // Import sql from drizzle-orm

export const usersTable = pgTable("users", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(), // Use SQL function explicitly
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(), // Use SQL function explicitly
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id), // Foreign key reference
  refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
