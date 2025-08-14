export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

export const AVAILABLE_LOGIN_PROVIDERS = ["email", "google"] as const;

export const AVAILABLE_LLM_PROVIDERS = [
	"openai",
	"anthropic",
	"deepseek",
	"google",
] as const;

export const VERIFICATION_TYPES = ["email", "password"] as const;

export const getApiUrl = (): string => {
	const url = process.env.NEXT_PUBLIC_API_URL;
	if (!url) throw new Error("NEXT_PUBLIC_API_URL is not defined");
	return url;
};

if (!REFRESH_TOKEN_EXPIRY) {
	throw new Error(
		"REFRESH_TOKEN_EXPIRY is not defined in environment variables",
	);
}

if (
	!AVAILABLE_LOGIN_PROVIDERS ||
	!AVAILABLE_LLM_PROVIDERS ||
	!VERIFICATION_TYPES
) {
	throw new Error(
		"One or more of AVAILABLE_LOGIN_PROVIDERS, AVAILABLE_LLM_PROVIDERS, or VERIFICATION_TYPES is not defined in environment variables",
	);
}
