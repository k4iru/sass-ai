"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Theme } from "@/shared/lib/types";

const defaultTheme: Theme = {
	theme: "light",
	toggleTheme: () => {},
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		document.documentElement.classList.toggle("dark", newTheme === "dark");
		localStorage.setItem("theme", newTheme); // Save to localStorage
	};

	useEffect(() => {
		// on load check for saved theme
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme === "dark" || savedTheme === "light") {
			setTheme(savedTheme);
			document.documentElement.classList.toggle("dark", savedTheme === "dark");
		} else {
			// default to system preference
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setTheme(prefersDark ? "dark" : "light");
			document.documentElement.classList.toggle("dark", prefersDark);
			localStorage.setItem("theme", prefersDark ? "dark" : "light"); // Save to localStorage
		}
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

// hook
export const useTheme = () => useContext(ThemeContext);
