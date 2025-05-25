"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

// type definitions

interface User {
	id: string;
	email: string;
	accessToken: string;
}

type authContextType = {
	user: User | null;
	login: (email: string, password: string) => void;
	setCurrUser: (user: User) => Promise<boolean>;
	logout: () => void;
};

// default object when context created.
const defaultAuthContextType: authContextType = {
	user: null,
	login: () => {},
	setCurrUser: () => Promise.resolve(false),
	logout: () => {},
};

const AuthContext = createContext<authContextType>(defaultAuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);

	// TODO this login function only sets access token / refresh token in cookies.
	// should also return user object to set in context.
	const login = async (email: string, password: string): Promise<void> => {
		const response = await fetch(`${ApiUrl}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		const data = await response.json();
		if (response.ok) {
			console.log("logged in, setting access token/id");
		} else {
			throw new Error(data.error);
		}
	};

	const setCurrUser = async (user: User): Promise<boolean> => {
		try {
			setUser(user);
			return true;
		} catch (err) {
			console.error(err instanceof Error ? err.message : "Unknown error");
			return false;
		}
	};

	const logout = async () => {
		await fetch(`${ApiUrl}/api/auth/logout`, {
			method: "POST",
			credentials: "include", // Include cookies in the request
		});
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, login, setCurrUser, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
