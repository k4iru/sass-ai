"use client";
import { useState } from "react";
import { useState, useEffect, useRef } from "react";
import { ChatListItem } from "@/components/ChatListItem/ChatListItem";
import { ConfirmModal } from "@/components/ConfirmModal/ConfirmModal";
import clsx from "clsx";
import styles from "./Sidebar.module.scss";
import { ArrowLeftFromLine, ArrowRightFromLineIcon } from "lucide-react";
import { useAllChatsContext } from "@/context/AllChatsContext";

export const Sidebar = () => {
	const { chats } = useAllChatsContext();
	const [isOpen, setIsOpen] = useState(true);

	const handleToggleSidebar = () => {
		setIsOpen(!isOpen);
	};
	return (
		<aside className={clsx(styles.sidebar, isOpen && styles.open)}>
			<div className={styles.topbar}>
				<input
					type="text"
					placeholder="Search..."
					className={styles.searchInput}
				/>
				<button
					type="button"
					className={styles.closeButton}
					onClick={handleToggleSidebar}
				>
					<ArrowLeftFromLine
						className={styles.closeIcon}
						stroke="currentColor"
					/>
				</button>
				<button
					type="button"
					className={styles.openButton}
					onClick={handleToggleSidebar}
				>
					<ArrowRightFromLineIcon
						className={styles.openIcon}
						stroke="currentColor"
					/>
				</button>
			</div>
			{chats && (
				<ul className={styles.chatList}>
					{chats.map((chat) => (
						<li key={chat.id} className={styles.chatItem}>
							<div className={styles.chatInfo}>
								<span className={styles.chatName}>{chat.title}</span>
								<span className={styles.chatDate}>
									{new Date(chat.createdAt).toLocaleDateString()}
								</span>
							</div>
						</li>
						<ChatListItem
							key={chat.id}
							id={chat.id}
							title={chat.title}
							onCloseMenu={() => setOpenMenuId(null)}
							isMenuOpen={openMenuId === chat.id}
							onToggleMenu={() =>
								setOpenMenuId((prevId) => (prevId === chat.id ? null : chat.id))
							}
							onRename={() => console.log("rename")}
							onDelete={() => console.log("deleting")}
						/>
					))}
				</ul>
			)}
		</aside>
	);
};
