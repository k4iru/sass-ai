"use client";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./SettingsMenu.module.scss";

export const SettingsMenu = () => {
	const { logout, user } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const handleClick = () => {
		setIsOpen((prev) => !prev);
		console.log("Settings button clicked");
		console.log("User:", user);
	};

	const handleClickOutside = useCallback((e: MouseEvent) => {
		if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
			setIsOpen(false);
		}
	}, []);

	const handleLogout = () => {
		logout();
	};

	useEffect(() => {
		// add event listener to handle clicks outside the menu
		document.addEventListener("pointerdown", handleClickOutside);

		// garbage collection
		return () => {
			document.removeEventListener("pointerdown", handleClickOutside);
		};
	}, [handleClickOutside]);
	return (
		<div className={styles.container} ref={menuRef}>
			<button
				type="button"
				className={styles.settingsButton}
				onClick={handleClick}
			>
				<Settings className={styles.settingsIcon} />
			</button>
			{isOpen && (
				<ul className={styles.popupMenu}>
					{user ? (
						<>
							<li>
								<Link href="/settings" className={styles.menuItem}>
									Settings
								</Link>
							</li>
							<li>
								<Link href="/api-keys" className={styles.menuItem}>
									API Keys
								</Link>
							</li>

							<li>
								<button
									type="button"
									onClick={handleLogout}
									className={styles.logoutButton}
								>
									Logout
								</button>
							</li>
						</>
					) : (
						<>
							<li>
								<Link href="/login" className={styles.menuItem}>
									Login
								</Link>
							</li>
						</>
					)}
				</ul>
			)}
		</div>
	);
};
