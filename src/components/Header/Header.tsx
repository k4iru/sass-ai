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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleOpenMenu = () => {
		setIsMobileMenuOpen(true);
	};

	const handleCloseMenu = () => {
		setIsMobileMenuOpen(false);
	};
	return (
		<header className={styles.header}>
			<div className={styles.desktopHeader}>
				<div className={styles.logoContainer}>
					<Image
						src="/images/logo.png"
						alt="Logo"
						width={150}
						height={75}
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
			<div className={styles.mobileHeader}>
				<button
					type="button"
					className={styles.mobileMenu}
					onClick={handleOpenMenu}
				>
					<Menu className={styles.menuIcon} stroke="currentColor" />
				</button>
				<div
					className={clsx(
						styles.mobilePopupMenu,
						isMobileMenuOpen && styles.open,
					)}
				>
					<div className={styles.mobileCloseButton}>
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
					<Link href="/profile" className={styles.mobileProfileLink}>
						Link 1
					</Link>
					<Link href="/profile" className={styles.mobileProfileLink}>
						Link 2
					</Link>
					<Link href="/profile" className={styles.mobileProfileLink}>
						Link 3
					</Link>
				</div>
			</div>
		</header>
	);
};
