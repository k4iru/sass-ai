"use client";

import type React from "react";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./login.module.scss";

function Login() {
	const router = useRouter();
	const { login, user } = useAuth();
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		// user already logged in
		if (user) router.push("/chat");
	});

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

		// handle post
		try {
			await login(formData.email, formData.password);
		} catch (error) {
			setMessage("Error submitting form.");
			setLoading(false);

			return;
		}

		// since redirect throws an error this needs to be outside the try catch block.
		setLoading(false);
		router.push("/chat");
		return;

		// handle message
	};
	return (
		<div className={styles.wrapper}>
			<h1 className={styles.header}>Welcome Back</h1>
			<form onSubmit={handleSubmit}>
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

				{message && <p className="">{message}</p>}
				<div className={styles.loginWrapper}>
					<button
						disabled={loading}
						type="submit"
						className={styles.loginButton}
					>
						Login
					</button>
				</div>
			</form>
		</div>
	);
}

export default Login;
