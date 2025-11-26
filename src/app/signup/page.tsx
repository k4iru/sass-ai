"use client";
import { useRouter } from "next/navigation";
import type React from "react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { signupSchema } from "@/lib/validation/signupSchema";
import { getApiUrl } from "@/shared/constants";
import styles from "./signup.module.scss";

const API_URL = getApiUrl();

const Signup = () => {
	const [formData, setFormData] = useState({
		first: "",
		last: "",
		email: "",
		password: "",
		passwordVerification: "",
	});
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const router = useRouter();
	const { setCurrUser } = useAuth();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// TODO look up server actions vs restful API. leaning towards just implementing everything as restful api though.
	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		// reset set up
		e.preventDefault();
		setLoading(true);
		setMessage(null);

		// check passwords match
		if (formData.password !== formData.passwordVerification) {
			setMessage("Passwords don't match");
			setLoading(false);
			return;
		}

		// Handle client validation use zod. Remember to also validate server side as well.
		const validationResult = signupSchema.safeParse(formData);
		if (!validationResult.success) {
			const errors = validationResult.error.errors
				.map((err) => err.message)
				.join(", ");
			setMessage(errors);
			setLoading(false); // Stop loading if validation fails
			return;
		}

		// handle post
		try {
			const response = await fetch(`${API_URL}/api/auth/signup`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			// success!
			if (!response.ok) {
				setMessage("Something went wrong.");
				setLoading(false);
				return;
			}

			const data = await response.json();

			if (!data.success) {
				setMessage(data.message || "Failed to sign up");
				setLoading(false);
				return;
			}

			if (data.success && data.user) {
				console.log("User signed up successfully:", data.user);
				setCurrUser(data.user);
				setLoading(false);
				router.push("/verify-email");
				return;
			}
		} catch (error) {
			setMessage(
				`Error submitting form: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			setLoading(false);

			return;
		}
	};
	return (
		<div className={styles.signupContainer}>
			<h1 className={styles.header}>Register</h1>
			<form onSubmit={handleSubmit}>
				<div className={styles.input}>
					<label htmlFor="first">First name</label>
					<input
						type="text"
						name="first"
						value={formData.first}
						onChange={handleChange}
						required
					/>
				</div>
				<div className={styles.input}>
					<label htmlFor="last">Last name</label>
					<input
						type="text"
						name="last"
						value={formData.last}
						onChange={handleChange}
						required
					/>
				</div>
				<div className={styles.input}>
					<label htmlFor="email">Email</label>
					<input
						type="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required
					/>
				</div>
				<div className={styles.input}>
					<label htmlFor="password">Password</label>
					<input
						type="password"
						name="password"
						value={formData.password}
						onChange={handleChange}
						required
					/>
				</div>
				<div className={styles.input}>
					<label htmlFor="passwordVerification">Verify Password</label>
					<input
						type="password"
						name="passwordVerification"
						value={formData.passwordVerification}
						onChange={handleChange}
						required
					/>
				</div>
				{message && <p className="text-red-500 text-small mt-2">{message}</p>}
				<div className="flex flex-row">
					<button
						disabled={loading}
						type="submit"
						className="border-black border-2 rounded-2xl py-2 px-4 hover:bg-gray-300 mx-auto mt-8"
					>
						Sign Up
					</button>
				</div>
			</form>
		</div>
	);
};

export default Signup;
