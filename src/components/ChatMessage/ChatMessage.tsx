import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import styles from "./ChatMessage.module.scss";
import "highlight.js/styles/atom-one-dark.css"; // or atom-one-light.css

interface ChatMessageProps {
	role: "human" | "ai" | "placeholder" | "error";
	content: string;
	type?: string;
}

const ChatMessage = ({ role, content, type }: ChatMessageProps) => {
	const messageClass =
		role === "human"
			? styles.human
			: role === "ai"
				? styles.ai
				: role === "error"
					? styles.error
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
