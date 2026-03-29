import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env/env.server";
import {
	IV_LENGTH,
	GCM_IV_LENGTH,
	GCM_AUTH_TAG_LENGTH,
} from "../../../shared/constants";

function getEncryptionKey(): Buffer {
	const serverEnv = getServerEnv();

	if (serverEnv.ENCRYPTION_KEY.length !== 64) {
		throw new Error(
			"Encryption key must be 32 bytes in hex format (64 characters)",
		);
	}
	return Buffer.from(serverEnv.ENCRYPTION_KEY, "hex");
}

export function encrypt(text: string): string {
	const key = getEncryptionKey();
	const iv = crypto.randomBytes(GCM_IV_LENGTH);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(text, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	return `gcm:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptGCM(text: string): string {
	const key = getEncryptionKey();
	const [, ivHex, authTagHex, encryptedHex] = text.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const authTag = Buffer.from(authTagHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(authTag);
	const decrypted = Buffer.concat([
		decipher.update(encryptedText),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

function decryptCBC(text: string): string {
	const key = getEncryptionKey();
	const [ivHex, encryptedHex] = text.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
	const decrypted = Buffer.concat([
		decipher.update(encryptedText),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

export function decrypt(text: string): string {
	if (text.startsWith("gcm:")) {
		return decryptGCM(text);
	}
	return decryptCBC(text);
}
