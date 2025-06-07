import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Header } from "@/components/Header/Header";
import styles from "./layout.module.scss";
import { Chatbox } from "@/components/Chatbox/Chatbox";

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			{/* swap this header for a chat specific header later to keep pop open menu */}
			<Header />
			<div className={styles.layout}>
				<Sidebar />

				<main className={styles.main}>
					<div className={styles.container}>{children}</div>
					<Chatbox />
				</main>
			</div>
		</>
	);
};

export default ChatLayout;
