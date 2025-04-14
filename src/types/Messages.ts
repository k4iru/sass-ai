export type Message = {
  role: "human" | "ai" | "placeholder";
  chat_id: string;
  user_id: string;
  content: string;
  created_at: Date;
};
export type MessageResponse = {
  success: boolean;
  message: string;
};
