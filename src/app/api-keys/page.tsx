"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addApiKey } from "@/actions/addApikey";
import { useAuth } from "@/context/AuthContext";
import { AVAILABLE_LLM_PROVIDERS } from "@/shared/constants";
import { getLogger } from "@/shared/logger.browser";
import styles from "./apikeys.module.scss";

const logger = getLogger({ module: "ApiKeys" });

type Provider = (typeof AVAILABLE_LLM_PROVIDERS)[number];

// initialize state with empty strings for each provider
const emptyApiKeys: Record<Provider, string> = AVAILABLE_LLM_PROVIDERS.reduce(
	(acc, provider) => {
		acc[provider] = "";
		return acc;
	},
	{} as Record<Provider, string>,
);

const ApiKeys = () => {
	const [apiKeys, setApiKeys] =
		useState<Record<Provider, string>>(emptyApiKeys);
	const [message, setMessage] = useState<Record<string, string | null>>({});
	const [loading, setLoading] = useState<boolean>(false);
	const { user } = useAuth();
	const router = useRouter();
	const MASK = "*************";

	useEffect(() => {
		if (!user) {
			router.push("/login");
			return;
		}

		async function fetchApiKeys() {
			try {
				const response = await fetch("/api/auth/has-keys", {
					method: "POST",
					credentials: "include",
				});

				if (!response.ok) {
					logger.error("Failed to fetch API key status");
					return;
				}

				const data = await response.json();
				const providersDict = data.providersDict;
				const newApiKeys = { ...emptyApiKeys };

				for (const provider in providersDict) {
					if (providersDict[provider]) {
						newApiKeys[provider as Provider] = MASK;
					}
				}
				setApiKeys(newApiKeys);
			} catch (error) {
				logger.error("Error fetching API key status", { error });
			}
		}

		fetchApiKeys();
	}, [user, router]);

	// update the correct provider when typing
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setApiKeys((prev) => ({ ...prev, [name]: value }));
	};

	const handleClick = async (provider: keyof typeof apiKeys) => {
		setLoading(true);
		setMessage((prev) => ({ ...prev, [provider]: null }));
		const value = apiKeys[provider];
		if (value === MASK) {
			setMessage((prev) => ({
				...prev,
				[provider]: "please enter a new key before saving",
			}));
			return;
		}

		logger.log("Name:", provider);
		logger.log("Value:", apiKeys[provider]);

		if (!user) throw new Error("Invalid user");
		const { success } = await addApiKey(user.id, provider, value);

		if (success) {
			setMessage((prev) => ({
				...prev,
				[provider]: "key updated successfully",
			}));
			setLoading(false);
		} else {
			setMessage((prev) => ({
				...prev,
				[provider]: "there was an error setting the key",
			}));
			setLoading(false);
		}
	};
	return (
		<div className={styles.wrapper}>
			<h1>API Keys</h1>
			<div className={styles.apiKeyContainer}>
				{Object.keys(apiKeys).map((provider) => (
					<div key={provider} className={styles.apiKeyRow}>
						<div className={styles.providerInputWrap}>
							<label className={styles.provider} htmlFor={provider}>
								{provider}
							</label>
							<input
								name={provider}
								type="text"
								placeholder={`Enter your ${provider} API key`}
								className={styles.apiKeyInput}
								value={apiKeys[provider as keyof typeof apiKeys]}
								onChange={handleChange}
								onFocus={() => {
									if (apiKeys[provider as Provider] === MASK) {
										setApiKeys((prev) => ({ ...prev, [provider]: "" }));
									}
								}}
								disabled={loading}
							/>
							<button
								type="button"
								className={styles.addButton}
								onClick={() => handleClick(provider as keyof typeof apiKeys)}
							>
								Add
							</button>
						</div>
						{message[provider] && (
							<div className={styles.messageWrap}>
								<p className={styles.message}>{message[provider]}</p>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default ApiKeys;
