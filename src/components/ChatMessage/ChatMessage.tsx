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
	animate?: boolean;
}

const ChatMessage = ({ role, content, animate }: ChatMessageProps) => {
	const messageClass =
		role === "human"
			? styles.human
			: role === "ai"
				? styles.ai
				: styles.placeholder;

	if (role === "ai" && animate) return <div>test</div>;

	return (
		<div className={messageClass}>
			animate {animate !== undefined ? animate.toString() : false.toString()}
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[[rehypeSanitize, schema], rehypeHighlight]}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
};

export default ChatMessage;
