import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Header } from "@/components/Header/Header";
import styles from "./layout.module.scss";
const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			{/* swap this header for a chat specific header later to keep pop open menu */}
			<Header />
			<div className={styles.layout}>
				<Sidebar />

				<main>{children}</main>
			</div>
		</>
	);
};

export default ChatLayout;
