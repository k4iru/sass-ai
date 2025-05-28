"use client";
import Link from "next/link";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";
import Image from "next/image";
import { useState } from "react";
import { UserRound, Menu, ArrowLeftToLine } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";

export const Header = () => {
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
							width={150}
							height={50}
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
					<div className={styles.closeButton}>
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
					<Link href="/profile" className={styles.link}>
						Link 1
					</Link>
					<Link href="/profile" className={styles.link}>
						Link 2
					</Link>
					<Link href="/profile" className={styles.link}>
						Link 3
					</Link>
				</div>
			</div>
		</header>
	);
};
