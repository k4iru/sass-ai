"use client";
import { useState } from "react";

import clsx from "clsx";
import styles from "./Sidebar.module.scss";
import { ArrowLeftFromLine, ArrowRightFromLineIcon } from "lucide-react";

import { Input } from "@/components/ui/Input/Input";
import { ChatListPanel } from "../ChatListPanel/ChatListPanel";
import useChatMenuController from "@/hooks/useChatMenuController";

export const Sidebar = () => {
	const controller = useChatMenuController();

	const [isOpen, setIsOpen] = useState(true);

	const handleToggleSidebar = () => {
		setIsOpen(!isOpen);
	};

	return (
		<>
			<aside className={clsx(styles.sidebar, isOpen && styles.open)}>
				<div className={styles.topbar}>
					<Input
						type="text"
						value={controller.searchTerm}
						onChange={(e) => controller.setSearchTerm(e.target.value)}
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
				{controller.filteredChats && controller.filteredChats.length > 0 ? (
					<ChatListPanel
						filteredChats={controller.filteredChats}
						openMenuId={controller.openMenuId}
						setOpenMenuId={controller.setOpenMenuId}
						pendingDeleteId={controller.pendingDeleteId}
						setPendingDeleteId={controller.setPendingDeleteId}
						renamingChatId={controller.renamingChatId}
						setRenamingChatId={controller.setRenamingChatId}
						newTitle={controller.newTitle}
						setNewTitle={controller.setNewTitle}
						handleRenameSubmit={controller.handleRenameSubmit}
						handleDelete={controller.handleDelete}
					/>
				) : (
					<></>
				)}
			</aside>
		</>
	);
};
