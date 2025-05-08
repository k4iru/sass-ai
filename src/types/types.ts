export type Message = {
	id?: number;
	role: "human" | "ai" | "placeholder";
	chatId: string;
	userId: string;
	content: string;
	createdAt: Date;
};
export type MessageResponse = {
	success: boolean;
	message: string;
};

export type Theme = {
	theme: "light" | "dark";
	toggleTheme: () => void;
};
