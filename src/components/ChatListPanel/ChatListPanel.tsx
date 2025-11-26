import { createPortal } from "react-dom";
import type { Chat } from "@/shared/lib/types";
import { ChatListItem } from "../ChatListItem/ChatListItem";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";

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
	);
};
