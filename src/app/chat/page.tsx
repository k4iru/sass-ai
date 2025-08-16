"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./chat.module.scss";

const Chat = () => {
	const { user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		console.log(user);
		if (!user) {
			console.error("User is not authenticated. Redirecting to login.");
			router.push("/login");
		}

		if (user && !user.emailVerified) {
			router.push("/verify-email");
		}
	}, [user, router]);

	return (
		<div className={styles.cta}>
			<h1 className={styles.newchat}>How can I help you today?</h1>
		</div>
	);
};

export default Chat;
