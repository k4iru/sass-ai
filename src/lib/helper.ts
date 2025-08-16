import crypto from "node:crypto";
import {
	AIMessage,
	type BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import {
	AVAILABLE_LLM_PROVIDERS,
	AVAILABLE_LOGIN_PROVIDERS,
	REFRESH_TOKEN_EXPIRY,
	VERIFICATION_TYPES,
} from "@/lib/constants";
import type {
	AccessCode,
	Chat,
	ChatContext,
	Message,
	MessageHistory,
	RefreshToken,
	User,
} from "@/lib/types";

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

export async function getRecentMessages(
	userId: string,
	chatId: string,
	lastSummaryIndex: number,
	lastMessageIndex: number,
): Promise<string> {
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
		console.log(error);
		return "";
	}
}

export async function updateTokenUsage(
	userId: string,
	chatId: string,
	tokensUsed: number,
): Promise<void> {
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
		console.log(error);
	}
}

export async function insertMessage(messages: Message[]): Promise<boolean> {
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
		console.log(
			`database error: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
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
		console.log(
			`Error getting access code: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

export async function getAccessCode(
	userId: string,
	type: string,
): Promise<AccessCode | null> {
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

		if (!accessCodes.length) throw new Error("Can't get apiKey");

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
		console.log(
			`Error getting access code: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return null;
	}
}

export async function emailVerified(userId: string): Promise<boolean> {
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
		console.log(
			`Error checking email verification: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
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
		console.log(
			`Error inserting user: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return null;
	}
}

export async function insertAccessCode(
	userId: string,
	accessCode: string,
	type: string,
): Promise<boolean> {
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
		console.log(
			`Error inserting access code: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

export async function getApiKey(
	userId: string,
	provider: string,
): Promise<string | null> {
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
		console.log(error);
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
		// Ensure the chat belongs to the user
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

export async function getSummary(
	userId: string,
	chatId: string,
): Promise<{ summary: string; lastIndex: number }> {
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
		console.log(error);
		return { summary: "", lastIndex: -1 };
	}
}

export async function createChatContext(
	message: Message,
): Promise<ChatContext> {
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
		console.log("error creating context", error);
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

export function convertToBaseMessageArray(
	messages: MessageHistory[],
): BaseMessage[] {
	const baseMessages = messages.map((msg) => {
		if (msg.role === "human") {
			return new HumanMessage(msg.content);
		}
		if (msg.role === "ai") {
			return new AIMessage(msg.content);
		}
		return new SystemMessage(msg.content);
	});

	return baseMessages;
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
			tokens: row.tokens || 0, // default to 0 if not provided
			provider: row.provider || "", // default to empty string if not provided
			createdAt: row.createdAt as Date,
			messageOrder: row.messageOrder,
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

export async function updateSummary(
	userId: string,
	chatId: string,
	summary: string,
	lastSummaryIndex: number,
): Promise<boolean> {
	try {
		await db
			.update(schema.summaries)
			.set({ summary: summary, lastIndex: lastSummaryIndex - 1 })
			.where(
				and(
					eq(schema.summaries.chatId, chatId),
					eq(schema.summaries.userId, userId),
				),
			);
	} catch (error) {
		console.log(error);
		return false;
	}
	return true;
}

export async function createSummary(
	userId: string,
	chatId: string,
): Promise<boolean> {
	try {
		await db.insert(schema.summaries).values({
			userId: userId,
			chatId: chatId,
			lastIndex: 0,
		});
	} catch (error) {
		console.log(error);
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
		console.log(
			`database error: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		return false;
	}
}
