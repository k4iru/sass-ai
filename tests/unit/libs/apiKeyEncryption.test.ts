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

	test("test encrypt / decrypt", () => {
		const text = "Hello, World!";
		const encrypted = encrypt(text);
		expect(encrypted).not.toBe(text);
		const decrypted = decrypt(encrypted);
		expect(decrypted).toBe(text);
	});
});
