import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env/env.server";
import { IV_LENGTH } from "../../../shared/constants";

function getEncryptionKey(): string {
	const serverEnv = getServerEnv();

	if (serverEnv.ENCRYPTION_KEY.length !== 64) {
		throw new Error(
			"Encryption key must be 32 bytes in hex format (64 characters)",
		);
	}
	return serverEnv.ENCRYPTION_KEY;
}

export function encrypt(text: string): string {
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		Buffer.from(getEncryptionKey(), "hex"),
		iv,
	);
	const encrypted = Buffer.concat([
		cipher.update(text, "utf8"),
		cipher.final(),
	]);
	return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
	const [ivHex, encryptedHex] = text.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv(
		"aes-256-cbc",
		Buffer.from(getEncryptionKey(), "hex"),
		iv,
	);
	const decrypted = Buffer.concat([
		decipher.update(encryptedText),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}
