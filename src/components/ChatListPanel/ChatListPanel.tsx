import Link from "next/link";
import { createPortal } from "react-dom";
import type { Chat } from "@/shared/lib/types";
import { ChatListItem } from "../ChatListItem/ChatListItem";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import styles from "./ChatListPanel.module.scss";

export const ChatListPanel = ({
	filteredChats,
	openMenuId,
	setOpenMenuId,
	pendingDeleteId,
	setPendingDeleteId,
	renamingChatId,
	setRenamingChatId,
	newTitle,
	setNewTitle,
	handleRenameSubmit,
	handleDelete,
}: {
	filteredChats: Chat[];
	openMenuId: string | null;
	setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
	pendingDeleteId: string | null;
	renamingChatId: string | null;
	newTitle: string;
	setPendingDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
	setRenamingChatId: React.Dispatch<React.SetStateAction<string | null>>;
	setNewTitle: React.Dispatch<React.SetStateAction<string>>;
	handleRenameSubmit: () => Promise<void>;
	handleDelete: () => Promise<void>;
}) => {
	return (
		<>
			<div className={styles.newChatWrapper}>
				<Link className={styles.newChatIconWrapper} href="/chat">
					<svg
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						className={styles.newChatIcon}
						fill="currentColor"
					>
						<title>New Chat</title>
						<g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
						<g
							id="SVGRepo_tracerCarrier"
							strokeLinecap="round"
							strokeLinejoin="round"
						></g>
						<g id="SVGRepo_iconCarrier">
							{" "}
							<g>
								{" "}
								<path fill="none" d="M0 0h24v24H0z"></path>{" "}
								<path d="M14 3v2H4v13.385L5.763 17H20v-7h2v8a1 1 0 0 1-1 1H6.455L2 22.5V4a1 1 0 0 1 1-1h11zm5 0V0h2v3h3v2h-3v3h-2V5h-3V3h3z"></path>{" "}
							</g>{" "}
						</g>
					</svg>
					<span className={styles.newChatText}>New Chat</span>
				</Link>
			</div>
			<ul>
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
							setOpenMenuId((prevId: string | null) =>
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
				{pendingDeleteId &&
					createPortal(
						<ConfirmModal
							message="are you sure you want to delete?"
							onConfirm={handleDelete}
							onCancel={() => setPendingDeleteId(null)}
						/>,
						document.body,
					)}
			</ul>
		</>
	);
};
