import styles from "./layout.module.scss";
const chatIdLayout = ({ children }: { children: React.ReactNode }) => {
	// on load. Need to check if the chatId is valid and also if user has access to it.

	return <>{children}</>;
};

export default chatIdLayout;
