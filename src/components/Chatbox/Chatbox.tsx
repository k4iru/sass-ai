"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "@/components/Chatbox/Chatbox.module.scss";
import { FilePlus, ArrowBigRight } from "lucide-react";

export const Chatbox = () => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// resize the textarea based on its content
	// and limit its height to a maximum of 160px / 10rem
	const resizeTextarea = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";

		const maxHeight = 160;
		el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
	}, []);

	const sendMessage = () => {
		console.log("Message sent");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // prevent newline
			sendMessage();
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
					rows={1}
				/>
			</div>
			<div className={styles.bottom}>
				<button type="button" className={styles.fileButton}>
					<FilePlus className={styles.fileIcon} />
				</button>
				<span className={styles.spacer} />
				<div className={styles.modelSelector}>
					<label htmlFor="model" className={styles.modelLabel}>
						Model:
					</label>
					<select name="model" className={styles.modelSelect} />
				</div>
				<button type="button" className={styles.sendButton}>
					<ArrowBigRight className={styles.sendIcon} />
				</button>
			</div>
		</div>
	);
};
