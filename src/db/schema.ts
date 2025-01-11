import { timestamp, integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
