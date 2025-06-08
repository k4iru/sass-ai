"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import styles from "@/components/Chatbox/Chatbox.module.scss";
import { FilePlus, ArrowBigRight, ChevronDown } from "lucide-react";
import { redirect, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const Chatbox = () => {
	const params = useParams();
	const chatId = params?.chatId;
	const { user } = useAuth();
	const [text, setText] = useState<string>("");
	const [currModel, setCurrModel] = useState<string>("gpt-3.5-turbo");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// resize the textarea based on its content
	// and limit its height to a maximum of 160px / 10rem
	// onInput for side effects
	const resizeTextarea = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";

		const maxHeight = 160;
		el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
	}, []);

	const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setCurrModel(e.target.value);
	};

	const sendMessage = () => {
		// on send. if not on specific chatId in url. then create a new chat
		// and send the message to the server

		if (!text.trim()) {
			console.log("Empty message, not sending");
			return; // don't send empty messages
		}
		// get potential chatId from the URL
		if (!chatId) {
			console.log("No chatId found in URL");

			const newChatId = uuidv4();
			console.log(newChatId);

			fetch(`${ApiUrl}/api/auth/create-chatroom`, {
				method: "POST",
				credentials: "include", // Include cookies in the request
				body: JSON.stringify({
					chatId: newChatId,
					userId: user?.id,
					message: text,
				}),
			});

			setText(""); // clear the input after sending
			redirect(`/chat/${newChatId}`);

			// send api request to create a new chat. Also change the URL to include the new chatId
			// on new chatId page. subscribe to the new chatId chatroom with web sockets on postgresl listen / notify

			// fetch `/api/auth/create-chatroom` with the userId and chatId
		} else {
			console.log(`Sending message to chatId: ${chatId}`);
		}
		console.log("Message sent");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // prevent newline
			if (text.trim().length > 0) {
				console.log(text);

				sendMessage();
				setText(""); // clear the input after sending
			}
		}
	};

	useEffect(() => {
		resizeTextarea();
	}, [resizeTextarea]);

	return (
		<div className={styles.chatbox}>
			<div className={styles.input}>
				<textarea
					aria-label="Chat input"
					placeholder="Type your message here..."
					ref={textareaRef}
					className={styles.textarea}
					onInput={resizeTextarea}
					onKeyDown={handleKeyDown}
					onChange={(e) => setText(e.target.value)}
					rows={1}
					value={text}
				/>
			</div>
			<div className={styles.bottom}>
				<button type="button" className={styles.fileButton}>
					<FilePlus className={styles.fileIcon} />
				</button>
				<span className={styles.spacer} />
				<div className={styles.modelSelector}>
					<label htmlFor="model" className={styles.modelLabel}>
						{currModel}
					</label>
					<div className={styles.selectWrapper}>
						<select
							name="model"
							className={styles.modelSelect}
							onChange={handleModelChange}
						>
							<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							<option value="gpt-4">GPT-4</option>
							<option value="gpt-4-vision-preview">GPT-4 Vision Preview</option>
							<option value="gpt-4o">GPT-4o</option>
							<option value="gpt-4o-mini">GPT-4o Mini</option>
							<option value="gpt-4-turbo">GPT-4 Turbo</option>
							<option value="gpt-4-turbo-preview">GPT-4 Turbo Preview</option>
						</select>
						<ChevronDown className={styles.selectIcon} />
					</div>
				</div>
				<button
					type="button"
					className={styles.sendButton}
					onClick={sendMessage}
				>
					<ArrowBigRight className={styles.sendIcon} />
				</button>
			</div>
		</div>
	);
};
