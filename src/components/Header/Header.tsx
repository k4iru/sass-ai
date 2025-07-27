"use client";
import Link from "next/link";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";
import Image from "next/image";
import { useMemo, useState } from "react";
import { UserRound, Menu, ArrowLeftToLine } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";
import { Input } from "@/components/ui/Input/Input";
import { ChatListItem } from "@/components/ChatListItem/ChatListItem";
import { ConfirmModal } from "@/components/ConfirmModal/ConfirmModal";
import { useAllChatsContext } from "@/context/AllChatsContext";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const Header = () => {
	const { chats, refreshChats } = useAllChatsContext();
	const { user } = useAuth();

	const router = useRouter();
	const pathname = usePathname();

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState<string>("");

	const filteredChats = useMemo(() => {
		if (!searchTerm || !searchTerm.trim()) return chats;

		return chats.filter((chat) =>
			chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
		);
	}, [searchTerm, chats]);

	const handleOpenMenu = () => {
		setIsMenuOpen(true);
	};

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
						onChange={(e) => setSearchTerm(e.target.value)}
						value={searchTerm}
					/>
					{/* chat links */}
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
				</div>
				<div className={clsx(styles.overlay, isMenuOpen && styles.open)} />
			</div>
			{pendingDeleteId &&
				createPortal(
					<ConfirmModal
						message="are you sure you want to delete?"
						onConfirm={handleDelete}
						onCancel={() => setPendingDeleteId(null)}
					/>,
					document.body,
				)}
		</header>
	);
};
