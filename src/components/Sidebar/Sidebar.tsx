"use client";
import { useState } from "react";
import clsx from "clsx";
import styles from "./Sidebar.module.scss";
import { ArrowLeftFromLine, ArrowRightFromLineIcon } from "lucide-react";

export const Sidebar = () => {
	const [isOpen, setIsOpen] = useState(true);

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
		</aside>
	);
};
