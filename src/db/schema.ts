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
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial(), // Use integer with autoIncrement
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: varchar("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const up = async (db) => {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_new_message()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM pg_notify('new_message', row_to_json(NEW)::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.execute(sql`
    CREATE TRIGGER message_insert_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();
  `);
};

export const down = async (db) => {
  await db.execute(sql`DROP TRIGGER IF EXISTS message_insert_trigger ON messages;`);
  await db.execute(sql`DROP FUNCTION IF EXISTS notify_new_message;`);
};
