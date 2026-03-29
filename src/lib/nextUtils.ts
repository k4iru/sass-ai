import crypto from "node:crypto";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
	AVAILABLE_LLM_PROVIDERS,
	AVAILABLE_LOGIN_PROVIDERS,
	REFRESH_TOKEN_EXPIRY,
	VERIFICATION_TYPES,
} from "@/shared/constants";
import { db, schema } from "@/shared/db";
import type {
	AccessCode,
	Chat,
	ChatContext,
	Message,
	RefreshToken,
	User,
} from "@/shared/lib/types";
import { getLogger } from "@/shared/logger";

const rateCalls = new Map<string, { count: number; lastReset: number }>();

// TODO split this helper file into separate files and group functions
export function getClientIP(req: NextRequest): string {
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0] || // Cloudflare/Proxy support
		req.headers.get("x-real-ip") || // Nginx support
		req.headers.get("cf-connecting-ip") || // Cloudflare
		"Unknown IP";
	return ip;
}

export async function getRecentMessages(
	userId: string,
	chatId: string,
	lastSummaryIndex: number,
	lastMessageIndex: number,
): Promise<string> {
	const logger = getLogger({ module: "getRecentMessages" });

	try {
		const rows = await db
			.select()
			.from(schema.messages)
			.where(
				and(
					eq(schema.messages.userId, userId),
					eq(schema.messages.chatId, chatId),
					gt(schema.messages.messageOrder, lastSummaryIndex),
					lt(schema.messages.messageOrder, lastMessageIndex),
				),
			)
			.orderBy(asc(schema.messages.messageOrder));

		const formattedMessages = rows.map((row) => {
			const role = row.role === "human" ? "User" : "Assistant";
			return `${role}: ${row.content}`;
		});

		return formattedMessages.join("\n");
	} catch (error) {
		logger.error("Error getting recent messages", { error });
		return "";
	}
}

export async function updateTokenUsage(
	userId: string,
	chatId: string,
	tokensUsed: number,
): Promise<void> {
	const logger = getLogger({ module: "updateTokenUsage" });

	try {
		// Check if record exists
		const existing = await db
			.select()
			.from(schema.tokenUsage)
			.where(
				and(
					eq(schema.tokenUsage.userId, userId),
					eq(schema.tokenUsage.chatId, chatId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			// Update existing record
			await db
				.update(schema.tokenUsage)
				.set({
					usage: existing[0].usage + tokensUsed,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(schema.tokenUsage.userId, userId),
						eq(schema.tokenUsage.chatId, chatId),
					),
				);
		} else {
			// Create new record initialized with usage
			await db.insert(schema.tokenUsage).values({
				userId,
				chatId,
				usage: tokensUsed, // Start with the current usage
			});
		}
	} catch (error) {
		logger.error("Error updating token usage", { error });
	}
}

export async function insertMessage(messages: Message[]): Promise<boolean> {
	const logger = getLogger({ module: "insertMessage" });

	if (messages.length === 0) return true;
	try {
		// check if chatroom exists first
		await createChatRoom(
			messages[0].userId,
			messages[0].chatId,
			messages[0].provider,
			messages[0].content.slice(0, 20),
		);

		await db.transaction(async (tx) => {
			for (const msg of messages) {
				await tx.insert(schema.messages).values({
					id: msg.id,
					role: msg.role,
					chatId: msg.chatId,
					userId: msg.userId,
					content: msg.content,
					createdAt: new Date(msg.createdAt),
					tokens: msg.tokens || 0,
					provider: msg.provider || "",
					messageOrder: msg.messageOrder,
				});
			}
		});
	} catch (err) {
		logger.error("Error inserting message", { error: err });
		return false;
	}
	return true;
}

export function isValidEnum<T extends readonly string[]>(
	val: string,
	enumArray: T,
): val is T[number] {
	return enumArray.includes(val as T[number]);
}

export async function deleteAccessCode(
	userId: string,
	type: string,
): Promise<boolean> {
	const logger = getLogger({ module: "deleteAccessCode" });

	try {
		if (!isValidEnum(type, VERIFICATION_TYPES)) {
			throw new Error("Invalid verification type");
		}
		const result = await db
			.delete(schema.accessCodes)
			.where(
				and(
					eq(schema.accessCodes.userId, userId),
					eq(schema.accessCodes.verificationType, type),
				),
			);

		if (result.rowCount === 0)
			throw new Error("No access code found to delete");

		return true;
	} catch (error) {
		logger.error("Error deleting access code", { error });
		return false;
	}
}

export async function getAccessCode(
	userId: string,
	type: string,
): Promise<AccessCode | null> {
	const logger = getLogger({ module: "getAccessCode" });

	try {
		if (!isValidEnum(type, VERIFICATION_TYPES)) {
			throw new Error("Invalid verification type");
		}
		const accessCodes = await db
			.select()
			.from(schema.accessCodes)
			.where(
				and(
					eq(schema.accessCodes.userId, userId),
					eq(schema.accessCodes.verificationType, type),
				),
			)
			.orderBy(desc(schema.accessCodes.createdAt));

		if (!accessCodes.length) throw new Error("Can't get access code");

		const accessCode: AccessCode = {
			id: accessCodes[0].id,
			userId: accessCodes[0].userId,
			accessCode: accessCodes[0].accessCode,
			verificationType: accessCodes[0].verificationType,
			createdAt: accessCodes[0].createdAt,
			expiryDate: accessCodes[0].expiryDate,
		};

		return accessCode;
	} catch (error) {
		logger.error("Error getting access code", { error });
		return null;
	}
}

export async function emailVerified(userId: string): Promise<boolean> {
	const logger = getLogger({ module: "emailVerified" });
	try {
		const result = await db
			.update(schema.usersTable)
			.set({ emailVerified: true })
			.where(eq(schema.usersTable.id, userId));

		if (result.rowCount === 0) {
			throw new Error("User not found or email already verified");
		}

		return true;
	} catch (error) {
		logger.error("Error checking email verification", { error });
		return false;
	}
}

export async function insertUser(
	first: string,
	last: string,
	email: string,
	password: string,
	loginProvider: string,
): Promise<User | null> {
	const logger = getLogger({ module: "insertUser" });
	try {
		if (!isValidEnum(loginProvider, AVAILABLE_LOGIN_PROVIDERS)) {
			throw new Error("Invalid verification type");
		}

		const user: typeof schema.usersTable.$inferInsert = {
			first: first,
			last: last,
			email: email,
			password: password,
			loginProvider: loginProvider,
		};

		const result = await db.insert(schema.usersTable).values(user).returning();

		if (!result.length) {
			throw new Error("Failed to insert user into the database");
		}

		return result[0];
	} catch (error) {
		logger.error("Error inserting user", { error });
		return null;
	}
}

export async function insertAccessCode(
	userId: string,
	accessCode: string,
	type: string,
): Promise<boolean> {
	const logger = getLogger({ module: "insertAccessCode" });
	try {
		// ensure valid type
		if (!isValidEnum(type, VERIFICATION_TYPES)) {
			throw new Error("Invalid verification type");
		}

		const newAccessCodeRow: typeof schema.accessCodes.$inferInsert = {
			userId: userId,
			accessCode: accessCode, // this should always be encrypted
			verificationType: type,
			createdAt: new Date(),
			expiryDate: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
		};

		const result = await db.insert(schema.accessCodes).values(newAccessCodeRow);

		if (!result) {
			throw new Error("Error inserting access code into table");
		}

		return true;
	} catch (error) {
		logger.error("Error inserting access code", { error });
		return false;
	}
}

export async function getApiKey(
	userId: string,
	provider: string,
): Promise<string | null> {
	const logger = getLogger({ module: "getApiKey" });
	if (!isValidEnum(provider, AVAILABLE_LLM_PROVIDERS))
		throw new Error("Invalid provider");
	try {
		const apiKeys = await db
			.select()
			.from(schema.apiKeys)
			.where(
				and(
					eq(schema.apiKeys.userId, userId),
					eq(schema.apiKeys.llmProvider, provider),
				),
			);

		if (!apiKeys.length) throw new Error("Can't get apiKey");

		return apiKeys[0].encryptedKey;
	} catch (error) {
		logger.error("Error getting API key", { error });
		return null;
	}
}

export async function renameChat(
	userId: string,
	chatId: string,
	newTitle: string,
): Promise<boolean> {
	const logger = getLogger({ module: "renameChat" });
	try {
		// Optional: sanitize or validate title
		const trimmedTitle = newTitle.trim();
		if (!trimmedTitle) {
			throw new Error("Title must not be empty.");
		}

		await db
			.update(schema.chats)
			.set({ title: trimmedTitle })
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		// if no rows are returned title is the same. ownership is verified in route handler so we can safely return true here
		return true;
	} catch (err) {
		logger.error("Error renaming chat", { error: err });
		return false;
	}
}

export async function deleteChat(
	userId: string,
	chatId: string,
): Promise<boolean> {
	const logger = getLogger({ module: "deleteChat" });
	try {
		// Only delete the chat — messages will be deleted via cascade
		const result = await db
			.delete(schema.chats)
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)));

		if (!result.rowCount) {
			throw new Error("Failed to delete chat");
		}

		return true;
	} catch (err) {
		logger.error("Error deleting chat", { error: err });
		return false;
	}
}

export async function getSummary(
	userId: string,
	chatId: string,
): Promise<{ summary: string; lastIndex: number }> {
	const logger = getLogger({ module: "getSummary" });
	try {
		const summaryObj = await db
			.select()
			.from(schema.summaries)
			.where(
				and(
					eq(schema.summaries.chatId, chatId),
					eq(schema.summaries.userId, userId),
				),
			);

		return {
			summary: summaryObj[0].summary,
			lastIndex: summaryObj[0].lastIndex,
		};
	} catch (error) {
		logger.error("Error getting summary", { error });
		return { summary: "", lastIndex: -1 };
	}
}

export async function createChatContext(
	message: Message,
): Promise<ChatContext> {
	const logger = getLogger({ module: "createChatContext" });
	try {
		// create chatroom if doesnt exist
		await createChatRoom(
			message.userId,
			message.chatId,
			message.provider,
			message.content.slice(0, 20),
		);
		const { summary, lastIndex } = await getSummary(
			message.userId,
			message.chatId,
		);

		// grab up to message turn
		const recentMessages = await db
			.select()
			.from(schema.messages)
			.where(
				and(
					eq(schema.messages.chatId, message.chatId),
					eq(schema.messages.userId, message.userId),
					gt(schema.messages.messageOrder, lastIndex),
				),
			)
			.orderBy(asc(schema.messages.messageOrder));

		// first message in chat
		if (recentMessages.length === 0)
			return {
				userId: message.userId,
				chatId: message.chatId,
				messages: [],
				approximateTotalTokens: 0,
				summary: summary,
				lastSummaryIndex: lastIndex,
			};

		const approximateTotalTokens = recentMessages.reduce(
			(acc, curr) => acc + curr.tokens,
			0,
		);

		return {
			userId: message.userId,
			chatId: message.chatId,
			messages: recentMessages,
			approximateTotalTokens: approximateTotalTokens,
			summary: summary,
			lastSummaryIndex: lastIndex,
		};
	} catch (error) {
		logger.error("Error creating context", { error });
		return {
			userId: message.userId,
			chatId: message.chatId,
			messages: [],
			approximateTotalTokens: 0,
			summary: "",
			lastSummaryIndex: -1,
		};
	}
}

export async function getMessages(
	userId: string,
	chatId: string,
): Promise<Message[]> {
	const logger = getLogger({ module: "getMessages" });
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
			tokens: row.tokens || 0, // default to 0 if not provided
			provider: row.provider || "", // default to empty string if not provided
			createdAt: row.createdAt as Date,
			messageOrder: row.messageOrder,
		}));
	} catch (err) {
		logger.error("Error getting messages", { error: err });
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

export async function createSummary(
	userId: string,
	chatId: string,
): Promise<boolean> {
	const logger = getLogger({ module: "createSummary" });
	try {
		await db.insert(schema.summaries).values({
			userId: userId,
			chatId: chatId,
			lastIndex: 0,
		});
	} catch (error) {
		logger.error("Error creating summary", { error });
		return false;
	}
	return true;
}

export function generateRandomAccessCode(length = 8): string {
	const characters =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const bytes = crypto.randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += characters[bytes[i] % characters.length];
	}
	return result;
}

export async function createChatRoom(
	userId: string,
	roomName: string,
	model: string,
	title: string,
): Promise<boolean> {
	const logger = getLogger({ module: "createChatRoom" });
	// check if chat room already exists
	const existingChatRoom = await db
		.select()
		.from(schema.chats)
		.where(eq(schema.chats.id, roomName));

	if (existingChatRoom.length) {
		logger.info("Chat room already exists.");
		return false;
	}

	try {
		await db.transaction(async (tx) => {
			await tx.insert(schema.chats).values({
				id: roomName,
				userId: userId,
				model: model,
				title: title, // or any other default title
			});

			await tx.insert(schema.summaries).values({
				userId: userId,
				chatId: roomName,
				lastIndex: 0,
			});
		});

		return true;
	} catch (err) {
		logger.error("Error creating chat room", { error: err });
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

export async function getUserFromId(id: string): Promise<User | null> {
	const user = await db
		.select()
		.from(schema.usersTable)
		.where(eq(schema.usersTable.id, id));

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
	const logger = getLogger({ module: "deleteRefreshToken" });
	try {
		const result = await db
			.delete(schema.refreshTokensTable)
			.where(eq(schema.refreshTokensTable.id, refreshToken));

		// explicity throw an error
		if (!result.rowCount) {
			throw new Error("failed to delete from database");
		}
	} catch (err) {
		logger.error("Error deleting refresh token", { error: err });
		return false;
	}

	return true;
}

export async function deleteApiKey(
	userId: string,
	provider: string,
): Promise<boolean> {
	const logger = getLogger({ module: "deleteApiKey" });
	try {
		if (!isValidEnum(provider, AVAILABLE_LLM_PROVIDERS)) {
			throw new Error("Invalid provider");
		}

		const result = await db
			.delete(schema.apiKeys)
			.where(
				and(
					eq(schema.apiKeys.userId, userId),
					eq(schema.apiKeys.llmProvider, provider),
				),
			);

		if (result.rowCount === 0) throw new Error("No api key found to delete");
		return true;
	} catch (error) {
		logger.error("Error deleting API key", { error });
		return false;
	}
}

export async function verifyChatOwnership(
	userId: string,
	chatId: string,
): Promise<boolean> {
	const logger = getLogger({ module: "chatOwnershipVerified" });
	try {
		const chat = await db
			.select({ id: schema.chats.id })
			.from(schema.chats)
			.where(and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)))
			.limit(1);

		return chat.length > 0;
	} catch (error) {
		logger.error("Error verifying chat ownership", { error });
		return false;
	}
}

export async function insertApiKey(
	userId: string,
	provider: string,
	encryptedKey: string,
): Promise<boolean> {
	const logger = getLogger({ module: "insertApiKey" });
	try {
		if (!isValidEnum(provider, AVAILABLE_LLM_PROVIDERS)) {
			throw new Error("Invalid provider");
		}

		const newApiKeyRow: typeof schema.apiKeys.$inferInsert = {
			userId: userId,
			llmProvider: provider,
			encryptedKey: encryptedKey,
		};

		const result = await db.insert(schema.apiKeys).values(newApiKeyRow);
		if (!result) throw new Error("Error inserting API key into table");
		return true;
	} catch (error) {
		logger.error("Error adding API key", { error });
		return false;
	}
}

export async function insertRefreshToken(
	refreshToken: string,
	userId: string,
	accessToken: string,
	ip: string,
): Promise<boolean> {
	const logger = getLogger({ module: "insertRefreshToken" });
	try {
		const ms = Date.now() + Number.parseInt(REFRESH_TOKEN_EXPIRY) * 1000; // 7 days
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
		logger.error("Error inserting refresh token", { error: err });
		return false;
	}
}

export function rateLimiter(
	key: string,
	limit = 5,
	windowMs = 60_000,
): boolean {
	const now = Date.now();
	const entry = rateCalls.get(key) || { count: 0, lastReset: now };

	// reset window
	if (now - entry.lastReset > windowMs) {
		entry.count = 0;
		entry.lastReset = now;
	}

	entry.count++;
	rateCalls.set(key, entry);

	return entry.count <= limit;
}
