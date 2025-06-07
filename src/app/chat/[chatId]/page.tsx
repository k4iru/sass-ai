const ChatPage = () => {
	return (
		<>
			<p>chat with specific id page</p>
			<ul>
				{Array.from({ length: 100 }, (_, i) => (
					<li key={i}>Item {i + 1}</li>
				))}
			</ul>
		</>
	);
};

export default ChatPage;
