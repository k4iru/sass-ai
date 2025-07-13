import { type NextRequest, NextResponse } from "next/server";
import { eq, and, desc, asc } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Chat, Message } from "@/types/types";

const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

type User = typeof schema.usersTable.$inferSelect;
type RefreshToken = typeof schema.refreshTokensTable.$inferSelect;

// TODO split this helper file into separate files and group functions
export function getClientIP(req: NextRequest): string {
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0] || // Cloudflare/Proxy support
		req.headers.get("x-real-ip") || // Nginx support
		req.headers.get("cf-connecting-ip") || // Cloudflare
		"Unknown IP";
	return ip;
}

// deprecated, check api routes and remove soon
export const response = (
	success: boolean,
	message: string,
	status: number,
): NextResponse => {
	return NextResponse.json({ success, message }, { status });
};

export function timeStringToSeconds(input: string): number {
	const timeMatch = input.match(/^(\d+)([smhd])$/);

	if (!timeMatch) {
		throw new Error(
			`Invalid time format: ${input}. Use format like "15m" or "7d"`,
		);
	}

	const value = Number.parseInt(timeMatch[1]);
	const unit = timeMatch[2];

	const conversionRates: { [key: string]: number } = {
		s: 1, // seconds
		m: 60, // minutes → seconds
		h: 60 * 60, // hours → seconds
		d: 24 * 60 * 60, // days → seconds
	};

	if (!conversionRates[unit]) {
		throw new Error(`Invalid time unit: ${unit}. Use s/m/h/d`);
	}

	return value * conversionRates[unit];
}

export async function insertMessage(message: Message): Promise<boolean> {
	try {
		const parsedDate = new Date(message.createdAt);
		const newMessageRow: typeof schema.messages.$inferInsert = {
			id: message.id,
			role: message.role,
			chatId: message.chatId,
			userId: message.userId,
			content: message.content,
			createdAt: parsedDate,
			tokens: message.tokens || 0, // default to 0 if not provided
			provider: message.provider || "",
		};

		const result = await db.insert(schema.messages).values(newMessageRow);
		if (!result) throw new Error("Error inserting new message into table");
	} catch (err) {
		console.log(
			`database error: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}
	return true;
}

export async function getApiKey(
	userId: string,
	provider: string,
): Promise<string | null> {
	try {
		const apiKeys = await db
			.select()
			.from(schema.apiKeys)
			.where(
				and(
					eq(schema.apiKeys.userId, userId),
					eq(schema.apiKeys.provider, provider),
				),
			);

		if (!apiKeys.length) throw new Error("Can't get apiKey");

		return apiKeys[0].encryptedKey;
	} catch (error) {
		return null;
	}
}

export async function renameChat(
	userId: string,
	chatId: string,
	newTitle: string,
): Promise<boolean> {
	try {
		// Optional: sanitize or validate title
		const trimmedTitle = newTitle.trim();
		if (!trimmedTitle) {
			throw new Error("Title must not be empty.");
		}

		// Check if the chat exists and belongs to the user
		const existingChat = await db
			.select()
			.from(schema.chats)
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		if (!existingChat.length) {
			console.warn("Chat not found or does not belong to the user.");
			return false;
		}

		// Only rename if the title is different
		if (existingChat[0].title === trimmedTitle) {
			console.log("New title is the same as the current one.");
			return true; // No-op but successful
		}

		const result = await db
			.update(schema.chats)
			.set({ title: trimmedTitle })
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		if (!result.rowCount) {
			throw new Error("Failed to update chat title.");
		}

		return true;
	} catch (err) {
		console.error(
			`Error renaming chat: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}
}

export async function deleteChat(
	userId: string,
	chatId: string,
): Promise<boolean> {
	try {
		// Optional: Ensure the chat belongs to the user
		const chat = await db
			.select()
			.from(schema.chats)
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		if (!chat.length) {
			console.warn("Chat not found or does not belong to the user.");
			return false;
		}

		// Only delete the chat — messages will be deleted via cascade
		const result = await db
			.delete(schema.chats)
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		if (!result.rowCount) {
			throw new Error("Failed to delete chat");
		}

		return true;
	} catch (err) {
		console.error(
			`Error deleting chat: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}
}

export async function getMessages(
	userId: string,
	chatId: string,
): Promise<Message[]> {
	try {
		const messages = await db
			.select()
			.from(schema.messages)
			.where(
				and(
					eq(schema.messages.chatId, chatId),
					eq(schema.messages.userId, userId),
				),
			)
			.orderBy(asc(schema.messages.createdAt));

		return messages.map((row) => ({
			id: row.id,
			role: row.role as "human" | "ai" | "placeholder",
			chatId: row.chatId,
			userId: row.userId,
			content: row.content,
			provider: row.provider,
			createdAt: row.createdAt as Date,
		}));
	} catch (err) {
		console.error(
			`database error: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return [];
	}
}

export async function getAllChats(userId: string): Promise<Chat[]> {
	const chats = await db
		.select()
		.from(schema.chats)
		.where(eq(schema.chats.userId, userId))
		.orderBy(desc(schema.chats.createdAt));

	return chats;
}
export async function createChatRoom(
	userId: string,
	roomName: string,
	model: string,
	title: string,
): Promise<boolean> {
	// check if chat room already exists
	const existingChatRoom = await db
		.select()
		.from(schema.chats)
		.where(eq(schema.chats.id, roomName));

	if (existingChatRoom.length) {
		console.log("Chat room already exists.");
		return false;
	}

	try {
		const newChatRoom = await db.insert(schema.chats).values({
			id: roomName,
			userId: userId,
			model: model,
			title: title, // or any other default title
		});

		return true;
	} catch (err) {
		console.log(err instanceof Error ? err.message : "Unknown error");
		return false;
	}
}

export async function isExistingUser(email: string): Promise<boolean> {
	const existingUser = await db
		.select()
		.from(schema.usersTable)
		.where(eq(schema.usersTable.email, email));
	return existingUser.length > 0;
}

export async function getUserFromEmail(email: string): Promise<User | null> {
	const user = await db
		.select()
		.from(schema.usersTable)
		.where(eq(schema.usersTable.email, email));

	if (!user.length) return null;

	return user[0];
}

export async function getUserFromSub(sub: string): Promise<User | null> {
	const user = await db
		.select()
		.from(schema.usersTable)
		.where(eq(schema.usersTable.id, sub));

	if (!user.length) return null;

	return user[0];
}

export async function generateRefreshToken(): Promise<string> {
	let newRefreshTokenId = `sessId__${crypto.randomUUID()}`;
	const tokenExists = await db
		.select()
		.from(schema.refreshTokensTable)
		.where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

	// conflict, retry once more.
	if (tokenExists.length) {
		newRefreshTokenId = `sessId__${crypto.randomUUID()}`;
		const result = await db
			.select()
			.from(schema.refreshTokensTable)
			.where(eq(schema.refreshTokensTable.id, newRefreshTokenId));

		if (result.length) throw new Error("cannot generate new token");
	}

	return newRefreshTokenId;
}

export async function getRefreshToken(
	refreshToken: string,
): Promise<RefreshToken> {
	const query = await db
		.select()
		.from(schema.refreshTokensTable)
		.where(eq(schema.refreshTokensTable.id, refreshToken));

	// token doesn't exist
	if (!query.length) throw new Error("Couldn't find refresh token");
	return query[0];
}

export async function deleteRefreshToken(
	refreshToken: string,
): Promise<boolean> {
	try {
		const result = await db
			.delete(schema.refreshTokensTable)
			.where(eq(schema.refreshTokensTable.id, refreshToken));

		// explicity throw an error
		if (!result.rowCount) {
			throw new Error("failed to delete from database");
		}
	} catch (err) {
		console.log(
			`error deleting refresh token: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}

	return true;
}

export async function insertRefreshToken(
	refreshToken: string,
	userId: string,
	accessToken: string,
	ip: string,
): Promise<boolean> {
	try {
		console.log("in inserting refresh token");
		const ms =
			new Date().getTime() + Number.parseInt(REFRESH_TOKEN_EXPIRY) * 1000; // 7 days
		const expiryDate = new Date(ms);

		const newRefreshTokenRow: typeof schema.refreshTokensTable.$inferInsert = {
			id: refreshToken,
			userId: userId,
			accessToken: accessToken,
			ipAddress: ip,
			expiryDate: expiryDate,
		};

		const result = await db
			.insert(schema.refreshTokensTable)
			.values(newRefreshTokenRow);
		if (!result)
			throw new Error("Error inserting new refresh token into table");
		return true;
	} catch (err) {
		console.log(
			`database error: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}
}
