"use client";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { ChatListItem } from "@/components/ChatListItem/ChatListItem";
import { ConfirmModal } from "@/components/ConfirmModal/ConfirmModal";
import clsx from "clsx";
import styles from "./Sidebar.module.scss";
import { ArrowLeftFromLine, ArrowRightFromLineIcon } from "lucide-react";
import { useAllChatsContext } from "@/context/AllChatsContext";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input/Input";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const Sidebar = () => {
	const { chats, refreshChats } = useAllChatsContext();
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(true);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");

	const router = useRouter();
	const pathname = usePathname();

	const filteredChats = useMemo(() => {
		if (!searchTerm || !searchTerm.trim()) return chats;

		return chats.filter((chat) =>
			chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
		);
	}, [searchTerm, chats]);

	const handleRenameSubmit = async () => {
		if (!renamingChatId || !newTitle.trim()) return;

		await fetch(`${ApiUrl}/api/chat/rename-chat`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chatId: renamingChatId,
				newTitle: newTitle.trim(),
				userId: user?.id,
			}),
		});

		refreshChats();
		setRenamingChatId(null);
		setNewTitle("");
	};

	const handleDelete = async () => {
		if (!pendingDeleteId || !user) return;

		const userId = user.id;

		console.log("pendingdlete: ", pendingDeleteId);

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
		setPendingDeleteId(null);

		if (pathname.includes(pendingDeleteId)) {
			router.push("/chat");
		}
	};

	const handleToggleSidebar = () => {
		setIsOpen(!isOpen);
	};

	return (
		<>
			<aside className={clsx(styles.sidebar, isOpen && styles.open)}>
				<div className={styles.topbar}>
					<Input
						type="text"
						onChange={(e) => setSearchTerm(e.target.value)}
						value={searchTerm}
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
				{filteredChats && filteredChats.length > 0 ? (
					<>
						<span className={styles.chatsTitle}>Recent</span>
						<ul className={styles.chatList}>
							{filteredChats.map((chat) => (
								<ChatListItem
									key={chat.id}
									id={chat.id}
									title={chat.title}
									isRenaming={renamingChatId === chat.id}
									newTitle={newTitle}
									onChangeTitle={setNewTitle}
									onSubmitRename={handleRenameSubmit}
									onBlurRename={() => {
										if (newTitle.trim()) handleRenameSubmit();
										else {
											setRenamingChatId(null);
											setNewTitle("");
										}
									}}
									onCloseMenu={() => setOpenMenuId(null)}
									isMenuOpen={openMenuId === chat.id}
									onToggleMenu={() =>
										setOpenMenuId((prevId) =>
											prevId === chat.id ? null : chat.id,
										)
									}
									onRename={(id, currentTitle) => {
										setRenamingChatId(id);
										setNewTitle(currentTitle);
									}}
									onDelete={(id) => setPendingDeleteId(id)}
								/>
							))}
						</ul>
					</>
				) : (
					<></>
				)}
			</aside>
			{pendingDeleteId &&
				createPortal(
					<ConfirmModal
						message="are you sure you want to delete?"
						onConfirm={handleDelete}
						onCancel={() => setPendingDeleteId(null)}
					/>,
					document.body,
				)}
		</>
	);
};
