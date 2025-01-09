import { timestamp, integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
});

export const tokensTable = pgTable("refresh_tokens", {
  id: varchar({ length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
