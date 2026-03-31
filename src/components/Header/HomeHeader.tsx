"use client";
import clsx from "clsx";
import { ArrowLeftToLine, Menu, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";

export const HomeHeader = () => {
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
				</div>
				<div className={clsx(styles.overlay, isMenuOpen && styles.open)} />
			</div>
		</header>
	);
};
