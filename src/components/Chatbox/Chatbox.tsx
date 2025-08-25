"use client";

import clsx from "clsx";
import { ArrowBigRight, ChevronDown, FilePlus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation"; // App Router
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import styles from "@/components/Chatbox/Chatbox.module.scss";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import useUpload from "@/hooks/useUpload";
import type { Message } from "@/lib/types";

export const Chatbox = () => {
	const router = useRouter();
	const { pushMessage, pushInitialMessage, messages } = useChat();
	const params = useParams();
	const chatId = params?.chatId;
	const { user } = useAuth();
	const [text, setText] = useState<string>("");
	const [fileName, setFileName] = useState<string | null>(null);
	const [fileData, setFileData] = useState<null | File>(null);
	const [currModel, setCurrModel] = useState<string>("gpt-3.5-turbo");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { handleUpload } = useUpload();

	const onDrop = (acceptedFiles: File[]) => {
		setFileName(acceptedFiles[0].name);
		setFileData(acceptedFiles[0]);
	};

	const handleCloseFile = () => {
		setFileName(null);
		setFileData(null);
	};

	const {
		getRootProps,
		getInputProps,
		open,
		isDragActive,
		isFocused,
		isDragAccept,
	} = useDropzone({
		onDrop,
		maxFiles: 1,
		accept: {
			"application/pdf": [".pdf"],
		},
		noClick: true,
		noKeyboard: true,
	});

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

	const sendMessage = async () => {
		// on send. if not on specific chatId in url. then create a new chat
		// and send the message to the server

		if (!text.trim()) {
			console.log("Empty message, not sending");
			return; // don't send empty messages
		}

		if (!user || !user.id) return;

		const newMessageId = uuidv4();

		// get potential chatId from the URL
		if (!chatId) {
			console.log("No chatId found in URL");

			const newChatId = uuidv4();

			const newMessage: Message = {
				id: newMessageId,
				role: "human",
				chatId: newChatId as string,
				userId: user.id as string,
				content: text,
				provider: currModel,
				createdAt: new Date(),
				messageOrder: messages.length,
			};

			pushMessage(newMessage);
			pushInitialMessage(newMessage); // push to websocket
			router.push(`/chat/${newChatId}`);

			setText(""); // clear the input after sending
			return;

			// send api request to create a new chat. Also change the URL to include the new chatId
			// on new chatId page. subscribe to the new chatId chatroom with web sockets on postgresl listen / notify

			// fetch `/api/auth/create-chatroom` with the userId and chatId
		}
		console.log(`Sending message to chatId: ${chatId}`);

		const newMessage: Message = {
			id: newMessageId,
			role: "human",
			chatId: chatId as string,
			userId: user.id as string,
			content: text,
			createdAt: new Date(),
			provider: currModel,
			messageOrder: messages.length,
		};

		pushMessage(newMessage);
		setText("");

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
		<div
			{...getRootProps()}
			className={clsx(
				styles.chatbox,
				isFocused || isDragAccept ? styles.chatboxActive : "",
			)}
		>
			{isDragActive ? (
				<div>in drag mode</div>
			) : (
				<div className={styles.input}>
					{fileName ? (
						<div className={styles.buttonRow}>
							<div className={styles.uploadedFile}>{fileName}</div>
							<button type="button" onClick={handleCloseFile}>
								<X className={styles.icon} />
							</button>
						</div>
					) : null}
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
			)}

			<div className={styles.bottom}>
				<button type="button" className={styles.fileButton} onClick={open}>
					<FilePlus className={styles.fileIcon} />
					<input {...getInputProps()} />
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
