import styles from "./chat.module.scss";
const Chat = () => {
	return (
		<div className={styles.cta}>
			<h1 className={styles.newchat}>How can I help you today?</h1>
		</div>
	);
};

export default Chat;
export const metadata = {
	title: "Chat",
	description: "Chat with your AI assistant",
};
