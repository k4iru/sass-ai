"use client";

import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeToggle.module.scss";

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<button onClick={toggleTheme} type="button" className={styles.toggleButton}>
			{theme === "dark" ? "🌙 Dark" : "☀️ Light"}
		</button>
	);
}
