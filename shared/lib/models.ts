export const MODEL_REGISTRY = {
	openai: {
		displayName: "OpenAI",
		models: [
			{ id: "gpt-4.1", displayName: "GPT-4.1" },
			{ id: "gpt-4.1-mini", displayName: "GPT-4.1 Mini" },
			{ id: "gpt-4.1-nano", displayName: "GPT-4.1 Nano" },
			{ id: "o3", displayName: "o3" },
			{ id: "o3-mini", displayName: "o3 Mini" },
		],
		defaultModel: "gpt-4.1",
		summaryModel: "gpt-4.1-nano",
	},
	anthropic: {
		displayName: "Anthropic",
		models: [
			{ id: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6" },
			{ id: "claude-opus-4-6", displayName: "Claude Opus 4.6" },
			{
				id: "claude-haiku-4-5-20251001",
				displayName: "Claude Haiku 4.5",
			},
		],
		defaultModel: "claude-sonnet-4-6",
		summaryModel: "claude-haiku-4-5-20251001",
	},
} as const;

export type LLMProvider = keyof typeof MODEL_REGISTRY;

type AllModelIds<P extends LLMProvider = LLMProvider> =
	(typeof MODEL_REGISTRY)[P]["models"][number]["id"];

export type ModelId = AllModelIds;

export const PROVIDER_KEYS = Object.keys(MODEL_REGISTRY) as LLMProvider[];

const LEGACY_MODEL_PREFIX_MAP: Record<string, LLMProvider> = {
	gpt: "openai",
	o1: "openai",
	claude: "anthropic",
};

/**
 * Parse a "provider:modelId" string into its parts.
 * Falls back to the provider's default model if no model is specified.
 * Handles legacy model strings (e.g. "gpt-4") by mapping to the correct provider.
 */
export function parseProviderString(str: string): {
	provider: LLMProvider;
	modelId: string;
} {
	const [provider, modelId] = str.split(":") as [string, string | undefined];

	if (provider in MODEL_REGISTRY) {
		const typedProvider = provider as LLMProvider;
		return {
			provider: typedProvider,
			modelId: modelId || MODEL_REGISTRY[typedProvider].defaultModel,
		};
	}

	// Legacy fallback: match old model names like "gpt-4" or "claude-3-sonnet"
	for (const [prefix, mappedProvider] of Object.entries(
		LEGACY_MODEL_PREFIX_MAP,
	)) {
		if (str.startsWith(prefix)) {
			return {
				provider: mappedProvider,
				modelId: MODEL_REGISTRY[mappedProvider].defaultModel,
			};
		}
	}

	throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Build a "provider:modelId" string.
 */
export function buildProviderString(
	provider: LLMProvider,
	modelId: string,
): string {
	return `${provider}:${modelId}`;
}

/**
 * Get the default "provider:model" string (first provider, first default).
 */
export function getDefaultProviderString(): string {
	const firstProvider = PROVIDER_KEYS[0];
	return buildProviderString(
		firstProvider,
		MODEL_REGISTRY[firstProvider].defaultModel,
	);
}
