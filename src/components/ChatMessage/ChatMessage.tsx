import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { defaultSchema } from "hast-util-sanitize";
import styles from "./ChatMessage.module.scss";
import "highlight.js/styles/atom-one-dark.css"; // or atom-one-light.css

// Extend the schema to support code highlighting classes
const schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		code: [
			...(defaultSchema.attributes?.code || []),
			["className"], // enable language-* classes
		],
	},
};

interface ChatMessageProps {
	role: "human" | "ai" | "placeholder";
	content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
	const messageClass =
		role === "human"
			? styles.human
			: role === "ai"
				? styles.ai
				: styles.placeholder;

	return (
		<div className={messageClass}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[[rehypeSanitize, schema], rehypeHighlight]}
			>
				{content}
			</ReactMarkdown>
			{role === "human" ? <div className={styles.leftTriangle} /> : null}
		</div>
	);
};

export default ChatMessage;
