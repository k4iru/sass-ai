import crypto from "node:crypto";
import { describe, expect, test } from "vitest";
import { decrypt, encrypt } from "@/lib/encryption/apiKeyEncryption";

describe("apiKeyEncryption", () => {
	test("encryption key is set", () => {
		expect(process.env.ENCRYPTION_KEY).toBeDefined();
		expect(process.env.ENCRYPTION_KEY).toHaveLength(64); // 32 bytes in hex
		expect(process.env.ENCRYPTION_KEY).toEqual(
			"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		);
	});

	test("GCM encrypt / decrypt round-trip", () => {
		const text = "Hello, World!";
		const encrypted = encrypt(text);
		expect(encrypted).not.toBe(text);
		expect(encrypted.startsWith("gcm:")).toBe(true);
		const decrypted = decrypt(encrypted);
		expect(decrypted).toBe(text);
	});

	test("GCM format is correct", () => {
		const encrypted = encrypt("test-api-key");
		const parts = encrypted.split(":");
		expect(parts).toHaveLength(4);
		expect(parts[0]).toBe("gcm");
		expect(parts[1]).toHaveLength(24); // 12-byte IV = 24 hex chars
		expect(parts[2]).toHaveLength(32); // 16-byte auth tag = 32 hex chars
		expect(parts[3].length).toBeGreaterThan(0);
	});

	test("CBC backward compatibility", () => {
		const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
		const plaintext = "sk-legacy-api-key-12345";
		const encrypted = Buffer.concat([
			cipher.update(plaintext, "utf8"),
			cipher.final(),
		]);
		const cbcCiphertext = `${iv.toString("hex")}:${encrypted.toString("hex")}`;

		const decrypted = decrypt(cbcCiphertext);
		expect(decrypted).toBe(plaintext);
	});

	test("GCM detects tampered ciphertext", () => {
		const encrypted = encrypt("sensitive-key");
		const parts = encrypted.split(":");
		// Flip a character in the ciphertext
		const tampered = parts[3].replace(
			parts[3][0],
			parts[3][0] === "0" ? "1" : "0",
		);
		const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${tampered}`;

		expect(() => decrypt(tamperedCiphertext)).toThrow();
	});

	test("handles various plaintext lengths", () => {
		const cases = ["", "x", "sk-proj-abc123def456ghi789"];
		for (const text of cases) {
			const encrypted = encrypt(text);
			expect(decrypt(encrypted)).toBe(text);
		}
	});
});
