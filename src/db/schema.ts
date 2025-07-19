import {
	timestamp,
	pgTable,
	varchar,
	uuid,
	smallint,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	password: varchar("password", { length: 255 }).notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: uuid("user_id")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }), // Foreign key reference
	accessToken: varchar("access_token", { length: 500 }).notNull(),
	ipAddress: varchar("ip_address", { length: 255 }).notNull(),
	expiryDate: timestamp("expiry_date").notNull(), // Set expiry to 7 days from now
	createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
	id: uuid("id").primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
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
		.references(() => usersTable.id, { onDelete: "cascade" }),
	content: varchar("content").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	tokens: smallint("tokens").notNull(),
	provider: varchar("provider", { length: 100 }).notNull(),
	messageOrder: smallint("message_order").notNull(),
});

export const chatCounter = pgTable("chat_counter", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	chatId: uuid("chat_id")
		.notNull()
		.references(() => chats.id, { onDelete: "cascade" }),
	nextMessageOrder: smallint("next_message_order").notNull(),
});

export const summaries = pgTable("summaries", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	chatId: uuid("chat_id")
		.notNull()
		.references(() => chats.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	summary: varchar("summary")
		.notNull()
		.default("No previous conversation to summarize."),
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
