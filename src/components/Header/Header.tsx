import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";

export const Header = () => {
	return (
		<header className={styles.header}>
			<Image
				src="/images/logo.png"
				alt="Logo"
				width={150}
				height={75}
				className={styles.logo}
			/>
			<span className={styles.spacer} />
			<ThemeToggle />
			<Link href="/profile" className={styles.profileLink}>
				<UserRound className={styles.profileIcon} stroke="currentColor" />
			</Link>
			<SettingsMenu />
		</header>
	);
};
