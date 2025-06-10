import { use } from "react";
import { useChat } from "@/context/ChatContext";
import styles from "./layout.module.scss";

const chatIdLayout = ({ children }: { children: React.ReactNode }) => {
	return <>{children}</>;
};

export default chatIdLayout;
