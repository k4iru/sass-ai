import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./Header.module.scss";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu/SettingsMenu";

export const Header = () => {
	return (
		<header className={styles.header}>
			<Image src="/images/logo.png" alt="Logo" width={100} height={100} />
			<ThemeToggle />
			<Link href="/profile" className={styles.profileLink}>
				<UserRound className={styles.profileIcon} />
			</Link>
			<SettingsMenu />
		</header>
	);
};
