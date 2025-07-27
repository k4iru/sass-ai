import { useMemo, useState } from "react";
import { useAllChatsContext } from "@/context/AllChatsContext";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

function useChatMenuController() {
	const { chats, refreshChats } = useAllChatsContext();
	const { user } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	const [searchTerm, setSearchTerm] = useState("");
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
	const [newTitle, setNewTitle] = useState<string>("");

	const filteredChats = useMemo(() => {
		if (!searchTerm.trim()) return chats;
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
		await fetch(`${ApiUrl}/api/chat/delete-chat`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId: user.id, pendingDeleteId }),
		});
		refreshChats();
		setOpenMenuId(null);
		setPendingDeleteId(null);
		if (pathname.includes(pendingDeleteId)) {
			router.push("/chat");
		}
	};

	return {
		chats,
		filteredChats,
		searchTerm,
		setSearchTerm,
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
	};
}

export default useChatMenuController;
