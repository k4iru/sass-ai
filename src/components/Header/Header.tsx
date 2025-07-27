"use client";
import Link from "next/link";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";
import Image from "next/image";
import { useState } from "react";
import { UserRound, Menu, ArrowLeftToLine } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";
import { Input } from "@/components/ui/Input/Input";
import { ChatListItem } from "@/components/ChatListItem/ChatListItem";
import { ConfirmModal } from "@/components/ConfirmModal/ConfirmModal";
import { createPortal } from "react-dom";
import { ChatListPanel } from "../ChatListPanel/ChatListPanel";
import useChatMenuController from "@/hooks/useChatMenuController";

export const Header = () => {
	const controller = useChatMenuController();

	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const handleOpenMenu = () => {
		setIsMenuOpen(true);
	};

	const handleCloseMenu = () => {
		setIsMenuOpen(false);
	};
	return (
		<header className={styles.header}>
			<div className={styles.wrapper}>
				<button type="button" className={styles.menu} onClick={handleOpenMenu}>
					<Menu className={styles.menuIcon} stroke="currentColor" />
				</button>
				<div className={styles.desktopHeader}>
					<div className={styles.logoContainer}>
						<Image
							src="/images/logo.png"
							alt="Logo"
							width={120}
							height={40}
							className={styles.logo}
						/>
					</div>
					<span className={styles.spacer} />
					<ThemeToggle />
					<Link href="/profile" className={styles.profileLink}>
						<UserRound className={styles.profileIcon} stroke="currentColor" />
					</Link>
					<SettingsMenu />
				</div>
				<div className={clsx(styles.popupMenu, isMenuOpen && styles.open)}>
					<div className={styles.topWrapper}>
						<Image
							src="/images/logo.png"
							alt="Logo"
							width={120}
							height={40}
							className={styles.logo}
						/>
						<div className={styles.spacer} />
						<div className={styles.btnContainer}>
							<button
								type="button"
								onClick={handleCloseMenu}
								className={styles.closeButton}
							>
								<ArrowLeftToLine
									className={styles.closeIcon}
									stroke="currentColor"
								/>
							</button>
						</div>
					</div>
					<Input
						type="text"
						value={controller.searchTerm}
						onChange={(e) => controller.setSearchTerm(e.target.value)}
					/>
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
				</div>
				<div className={clsx(styles.overlay, isMenuOpen && styles.open)} />
			</div>
		</header>
	);
};
