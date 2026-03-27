"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLogger } from "@/shared/logger.browser";

const logger = getLogger({ module: "AuthHydrator" });

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const AuthHydrator = ({ children }: { children: React.ReactNode }) => {
	const { setCurrUser, user } = useAuth();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch(`${apiUrl}/api/auth/get-user`, {
					method: "POST",
					credentials: "include", // Include cookies in the request
					headers: { "Content-Type": "application/json" },
				});

				if (response.ok) {
					const data = await response.json();
					await setCurrUser(data.user);
				}
			} catch (err) {
				logger.error("Authentication check failed:", err);
			} finally {
				setLoading(false);
			}
		};

		if (!user) {
			fetchData();
		} else {
			setLoading(false);
		}
	}, [user, setCurrUser]);

	if (loading) return null;

	return <>{children}</>;
};
