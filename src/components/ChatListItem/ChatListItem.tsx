"use client";

import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import styles from "./ChatListItem.module.scss";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

type ChatListItemProps = {
	id: string;
	title: string;
	isMenuOpen: boolean;
	onCloseMenu: () => void;
	onToggleMenu: (id: string) => void;
	onRename: (id: string, newTitle: string) => void;
	onDelete: (id: string) => void;
	isRenaming: boolean;
	newTitle: string;
	onChangeTitle: (val: string) => void;
	onSubmitRename: () => void;
	onBlurRename: () => void;
};
export const ChatListItem = ({
	id,
	title,
	isMenuOpen,
	onCloseMenu,
	onToggleMenu,
	onRename,
	onDelete,
	isRenaming,
	newTitle,
	onChangeTitle,
	onSubmitRename,
	onBlurRename,
}: ChatListItemProps) => {
	const itemRef = useRef<HTMLLIElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		if (isRenaming && inputRef.current) {
			const input = inputRef.current;
			input.focus();

			// Move cursor to the end
			input.setSelectionRange(input.value.length, input.value.length);
		}
		if (isMenuOpen && itemRef.current) {
			const rect = itemRef.current.getBoundingClientRect();
			setMenuPosition({
				top: rect.top + window.scrollY,
				left: rect.right, // adjust based on popup width
			});
		}
		const handleClickOutside = (e: MouseEvent) => {
			if (
				isMenuOpen &&
				itemRef.current &&
				!itemRef.current.contains(e.target as Node) &&
				!popupRef.current?.contains(e.target as Node)
			) {
				onCloseMenu(); // close this menu
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen, onCloseMenu, isRenaming]);

	return (
		<li className={styles.item} ref={itemRef}>
			{isRenaming ? (
				<input
					ref={inputRef}
					className={styles.renameInput}
					value={newTitle}
					onChange={(e) => onChangeTitle(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onSubmitRename();
						if (e.key === "Escape") onBlurRename(); // optional escape handler
					}}
					onBlur={onBlurRename}
				/>
			) : (
				<Link href={`/chat/${id}`} className={styles.chatLink}>
					<span className={styles.chatName}>
						{title.length > 25 ? `${title.slice(0, 25)}…` : title}
					</span>
				</Link>
			)}
			<span className={styles.spacer} />

			<button
				type="button"
				className={styles.optionsButton}
				onClick={() => onToggleMenu(id)}
			>
				<MoreVertical className={styles.optionsIcon} />
			</button>
			{isMenuOpen &&
				createPortal(
					<div className={styles.menuPopup} style={menuPosition} ref={popupRef}>
						<button
							type="button"
							className={styles.menuItemRename}
							onClick={() => onRename(id, title)}
						>
							Rename
						</button>
						<button
							type="button"
							className={styles.menuItemDelete}
							onClick={() => onDelete(id)}
						>
							Delete
						</button>
					</div>,
					document.body,
				)}
		</li>
	);
};
