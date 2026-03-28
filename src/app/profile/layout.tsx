import { Header } from "@/components/Header/Header";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { AllChatsProvider } from "@/context/AllChatsContext";
import { ChatProvider } from "@/context/ChatContext";
import styles from "./layout.module.scss";

export const metadata = {
	title: "Profile",
	description: "Profile page",
};

const ProfileLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AllChatsProvider>
			<ChatProvider>
				<Header />
				<div className={styles.layout}>
					<Sidebar />

					<main className={styles.main}>
						<div className={styles.container}>{children}</div>
					</main>
				</div>
			</ChatProvider>
		</AllChatsProvider>
	);
};

export default ProfileLayout;
