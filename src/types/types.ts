export type Message = {
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
