import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
	...nextCoreWebVitals,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
			"@next/next/no-sync-scripts": "off",
			"react/no-unescaped-entities": "off",
		},
	},
];

export default eslintConfig;
