import { Sidebar } from "@/components/Sidebar/Sidebar";
const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<Sidebar />

			<main>{children}</main>
		</>
	);
};

export default ChatLayout;
