"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/shared/constants";
import { getLogger } from "@/shared/logger.browser";

const logger = getLogger({ module: "VerifyEmail" });

const VerifyEmail = () => {
	const [accessCodeString, setAccessCodeString] = useState("");
	const router = useRouter();
	const { user, setCurrUser } = useAuth();
	const API_URL = getApiUrl();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const response = await fetch(`${API_URL}/api/auth/verify-email`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({
				accessCodeString: accessCodeString,
			}),
		});

		const data = await response.json();
		if (!data.success) {
			logger.error("Error verifying email:", data.message);
			return;
		}

		if (data.success && data.user) {
			logger.log("Email verified successfully:", data.user);
			// Set the current user in context
			setCurrUser(data.user);
			router.push("/chat");
		}
	};

	useEffect(() => {
		if (!user) {
			router.push("/login");
			return;
		}
		if (user?.emailVerified) {
			logger.log("Email already verified");
			router.push("/chat");
			return;
		}
	}, [user, router]);
	return (
		<div>
			<h1>Verify your email please</h1>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					placeholder="Access code"
					value={accessCodeString}
					onChange={(e) => setAccessCodeString(e.target.value)}
				/>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
};

export default VerifyEmail;
