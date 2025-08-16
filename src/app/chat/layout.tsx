import { Chatbox } from "@/components/Chatbox/Chatbox";
import { Header } from "@/components/Header/Header";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { AllChatsProvider } from "@/context/AllChatsContext";
import { ChatProvider } from "@/context/ChatContext";
import styles from "./layout.module.scss";

export const metadata = {
	title: "Chat",
	description: "Chat with your AI assistant",
};

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AllChatsProvider>
			<ChatProvider>
				{/* swap this header for a chat specific header later to keep pop open menu */}
				<Header />
				<div className={styles.layout}>
					<Sidebar />

					<main className={styles.main}>
						<div className={styles.container}>{children}</div>
						<Chatbox />
					</main>
				</div>
			</ChatProvider>
		</AllChatsProvider>
	);
};

export default ChatLayout;
