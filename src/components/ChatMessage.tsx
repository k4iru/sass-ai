import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { defaultSchema } from "hast-util-sanitize";
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
			? "bg-blue-500 text-white"
			: role === "ai"
				? "bg-green-500 text-white"
				: "bg-gray-300 text-gray-700";

	return (
		<div className={`p-2 rounded-lg ${messageClass} mb-2`}>
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
