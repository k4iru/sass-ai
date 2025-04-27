import type React from "react";

interface ChatMessageProps {
	role: "human" | "ai" | "placeholder";
	content: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
	const messageClass =
		role === "human"
			? "bg-blue-500 text-white"
			: role === "ai"
				? "bg-green-500 text-white"
				: "bg-gray-300 text-gray-700";

	return (
		<div className={`p-2 rounded-lg ${messageClass} mb-2`}>
			<span>{content}</span>
		</div>
	);
};

export default ChatMessage;
