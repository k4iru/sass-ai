/*
 * Encryption Constants
 */
export const IV_LENGTH = 16;

/*
 * Database Constants
 */
export const AVAILABLE_LOGIN_PROVIDERS = ["email", "google"] as const;
export const AVAILABLE_LLM_PROVIDERS = [
	"openai",
	"anthropic",
	"deepseek",
	"google",
] as const;

export const VERIFICATION_TYPES = ["email", "password"] as const;

export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export const getApiUrl = (): string => {
	const url = process.env.NEXT_PUBLIC_API_URL;
	if (!url) throw new Error("NEXT_PUBLIC_API_URL is not defined");
	return url;
};
