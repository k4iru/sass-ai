"use client";

import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeToggle.module.scss";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<>
			<label className={styles.switch}>
				<input
					type="checkbox"
					onChange={toggleTheme}
					checked={theme === "dark"}
				/>
				<span className={styles.slider} />
				<Moon className={styles.moon} />
				<Sun className={styles.sun} />
			</label>
		</>
	);
}
