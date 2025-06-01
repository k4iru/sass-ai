import styles from "./chat.module.scss";
const Chat = () => {
	return (
		<div className={styles.container}>
			<h1>chat message</h1>
			<ul>
				{[...Array(100)].map((_, i) => (
					<li key={i}>Item {i + 1}</li>
				))}
			</ul>
		</div>
	);
};

export default Chat;
export const metadata = {
	title: "Chat",
	description: "Chat with your AI assistant",
};
