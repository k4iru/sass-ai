import { timestamp, pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	password: varchar("password", { length: 255 }).notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
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
	title: varchar("title", { length: 100 }).notNull(),
	model: varchar("model", { length: 100 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
	id: uuid("id").primaryKey(),
	role: varchar("role", { enum: ["human", "ai", "placeholder"] }).notNull(),
	chatId: uuid("chat_id")
		.notNull()
		.references(() => chats.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => usersTable.id),
	content: varchar("content").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: uuid("user_id")
		.notNull()
		.references(() => usersTable.id),
	encryptedKey: varchar("encrypted_key", { length: 500 }).notNull(),
	provider: varchar("provider", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});
