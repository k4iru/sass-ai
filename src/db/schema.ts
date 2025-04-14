import { timestamp, pgTable, varchar, uuid, integer, serial } from "drizzle-orm/pg-core"; // Add integer import
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
  id: varchar({ length: 255 }).primaryKey().notNull(), // Use SQL function explicitly
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id), // Foreign key reference
  accessToken: varchar("access_token", { length: 500 }).notNull(),
  ipAddress: varchar("ip_address", { length: 255 }).notNull(),
  expiryDate: timestamp("expiry_date").notNull(), // Set expiry to 7 days from now
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial(), // Use integer with autoIncrement
  role: varchar("role", { length: 50 }).notNull(), // Use varchar for roles
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: varchar("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
