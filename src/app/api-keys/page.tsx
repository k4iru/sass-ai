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
	const { user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!user) {
			router.push("/login");
		}
	});

	// update the correct provider when typing
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setApiKeys((prev) => ({ ...prev, [name]: value }));
	};

	const handleClick = async (provider: keyof typeof apiKeys) => {
		logger.log("Name:", provider);
		logger.log("Value:", apiKeys[provider]);

		if (!user) throw new Error("Invalid user");
		const { success } = await addApiKey(user.id, provider, apiKeys[provider]);

		if (success) {
			logger.log("good");
		} else {
			logger.log("bad");
		}
	};
	return (
		<div className={styles.wrapper}>
			<h1>API Keys</h1>
			<div className={styles.apiKeyContainer}>
				{Object.keys(apiKeys).map((provider) => (
					<div key={provider}>
						<label htmlFor={provider}>{provider}</label>
						<input
							name={provider}
							type="text"
							placeholder={`Enter your ${provider} API key`}
							className={styles.apiKeyInput}
							value={apiKeys[provider as keyof typeof apiKeys]}
							onChange={handleChange}
						/>
						<button
							type="button"
							className={styles.addButton}
							onClick={() => handleClick(provider as keyof typeof apiKeys)}
						>
							Add
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default ApiKeys;
