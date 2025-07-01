import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { defaultSchema } from "hast-util-sanitize";
import { AnimateContent } from "@/components/AnimateContent/AnimateContent";
import styles from "./ChatMessage.module.scss";
import "highlight.js/styles/atom-one-dark.css"; // or atom-one-light.css

// Extend the schema to support code highlighting classes
const schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
	},
};

interface ChatMessageProps {
	role: "human" | "ai" | "placeholder";
	content: string;
	type?: string;
}

const ChatMessage = ({ role, content, type }: ChatMessageProps) => {
	const messageClass =
		role === "human"
			? styles.human
			: role === "ai"
				? styles.ai
				: styles.placeholder;

	const renderContent = () => {
		if (type === "token") {
			return <pre>{content}</pre>;
		}

		return (
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
			>
				{content}
			</ReactMarkdown>
		);
	};

	return <div className={messageClass}>{renderContent()}</div>;
};

export default ChatMessage;
