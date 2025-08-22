"use client";

import { useState } from "react";
import { AVAILABLE_LLM_PROVIDERS } from "@/lib/constants";
import styles from "./apikeys.module.scss";

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

	// update the correct provider when typing
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setApiKeys((prev) => ({ ...prev, [name]: value }));
	};

	const handleClick = (provider: keyof typeof apiKeys) => {
		console.log("Name:", provider);
		console.log("Value:", apiKeys[provider]);
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
