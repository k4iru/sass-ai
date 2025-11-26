"use client";
import { createContext, useContext, useState } from "react";
import { getApiUrl } from "@/shared/constants";
import type { AuthUser } from "@/shared/lib/types";

type authContextType = {
	user: AuthUser | null;
	loading: boolean;
	login: (email: string, password: string) => void;
	setCurrUser: (user: AuthUser) => Promise<boolean>;
	logout: () => void;
};

// default object when context created.
const defaultAuthContextType: authContextType = {
	user: null,
	loading: true,
	login: () => {},
	setCurrUser: () => Promise.resolve(false),
	logout: () => {},
};

const AuthContext = createContext<authContextType>(defaultAuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	// TODO this login function only sets access token / refresh token in cookies.
	// should also return user object to set in context.
	const login = async (email: string, password: string): Promise<void> => {
		setLoading(true);
		const response = await fetch(`${getApiUrl()}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (response.ok) {
			const { success, userObj } = await response.json();

			if (!success || !userObj) {
				throw new Error("Login failed or user data not returned");
			}

			const authUser: AuthUser = {
				id: userObj.id,
				emailVerified: userObj.emailVerified,
			};
			setUser(authUser);
			setLoading(false);
			console.log("logged in, setting access token/id");
		} else {
			throw new Error("Error fetching user data after login");
		}
	};

	const setCurrUser = async (user: AuthUser): Promise<boolean> => {
		try {
			if (!user || !user.id) {
				throw new Error("Invalid user data provided");
			}
			setLoading(true);
			setUser(user);
			setLoading(false);
			console.log("Set current user in context");
			console.log(user);
			return true;
		} catch (err) {
			console.error(err instanceof Error ? err.message : "Unknown error");
			return false;
		}
	};

	const logout = async () => {
		await fetch(`${getApiUrl()}/api/auth/logout`, {
			method: "POST",
			credentials: "include", // Include cookies in the request
		});
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, login, loading, setCurrUser, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
