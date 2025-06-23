"use client";

import { useState, useEffect } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import styles from "./AnimateContent.module.scss";

type Token = {
	type: string;
	value: string;
	jsx: React.ReactElement;
};

export const AnimateContent = ({ content }: { content: string }) => {
	const [tokens, setTokens] = useState<ReturnType<typeof tokenizeMarkdown>>([]);
	const [visibleCount, setVisibleCount] = useState(0);

	useEffect(() => {
		const parsed = tokenizeMarkdown(content);
		setTokens(parsed);
		setVisibleCount(0);
	}, [content]);

	useEffect(() => {
		if (visibleCount >= tokens.length) return;

		const interval = setInterval(() => {
			setVisibleCount((prev) => prev + 1);
		}, 50); // Speed of the animation

		return () => clearInterval(interval);
	}, [visibleCount, tokens]);

	return (
		<div className={styles.animateWrapper}>
			{tokens.slice(0, visibleCount).map((token, i) => (
				<span className={styles.animate} key={i}>
					{token.jsx}
				</span>
			))}
		</div>
	);
};
// Parse markdown string into tokens
export function tokenizeMarkdown(markdown: string): Token[] {
	const tree = unified().use(remarkParse).parse(markdown);
	console.log(tree);

	const tokens: Token[] = [];

	// traverse the tree
	visit(tree, (node) => {
		if (node.type === "text") {
			// do stuff
			// split words into tokens as well so that we can animate word by word
			const words = node.value.split(/(\s+)/);

			for (const word of words) {
				if (word.trim()) {
					tokens.push({
						type: "text",
						value: word,
						jsx: <span key={crypto.randomUUID()}>{word}</span>, // think about where I should add the className for actually animating
					});
				} else {
					// then extra space characters
					tokens.push({
						type: "space",
						value: word,
						jsx: <span key={crypto.randomUUID()}>&nbsp;</span>,
					});
				}
			}
		}

		if (node.type === "strong") {
			// do stuff
		}

		if (node.type === "code" || node.type === "inlineCode") {
			tokens.push({
				type: "code",
				value: node.value,
				jsx: <code key={crypto.randomUUID()}>{node.value}</code>,
			});
		}
		// else if (node.type !== "root") {
		// 	// fallback for now

		// 	tokens.push({
		// 		type: node.type,
		// 		value: node.value,
		// 		jsx:
		// 	})
		// }
	});

	return tokens;
}
