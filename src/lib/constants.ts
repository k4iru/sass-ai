export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
export const AVAILABLE_LOGIN_PROVIDERS = ["email", "google"] as const;
export const AVAILABLE_LLM_PROVIDERS = [
	"openai",
	"anthropic",
	"deepseek",
	"google",
] as const;
