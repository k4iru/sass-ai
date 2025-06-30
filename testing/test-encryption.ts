import { encrypt, decrypt } from "../src/lib/encryption/apiKeyEncryption";

const input = process.argv[2];

if (!input) {
	console.error("usage error");
	process.exit(1);
}

const encrypted = encrypt(input);
const decrypted = decrypt(encrypted);

console.log(`original: ${input}`);
console.log(`encrypted: ${encrypted}`);
console.log(`decrypted: ${decrypted}`);
