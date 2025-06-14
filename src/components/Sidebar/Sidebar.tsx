"use client";
import { useState, useEffect, useRef } from "react";
import { ChatListItem } from "@/components/ChatListItem/ChatListItem";
import { ConfirmModal } from "@/components/ConfirmModal/ConfirmModal";
import clsx from "clsx";
import styles from "./Sidebar.module.scss";
import { ArrowLeftFromLine, ArrowRightFromLineIcon } from "lucide-react";
import { useAllChatsContext } from "@/context/AllChatsContext";
import { useAuth } from "@/context/AuthContext";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const Sidebar = () => {
	const { chats, refreshChats } = useAllChatsContext();
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(true);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!pendingDeleteId || !user) return;

		const userId = user.id;

		await fetch(`${ApiUrl}/api/chat/delete-chat`, {
			method: "POST",
			credentials: "include", // Include cookies in the request
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId, pendingDeleteId }),
		});

		refreshChats();
		setOpenMenuId(null);
	};

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
