"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGoogleOAuthURL } from "@/lib/auth";
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
	const [googleUrl, setGoogleUrl] = useState<string>("");

	useEffect(() => {
		// user already logged in
		if (user) router.push("/chat");
	});

	// get oauth
	useEffect(() => {
		const fetchUrl = async () => {
			const url = await getGoogleOAuthURL();
			setGoogleUrl(url);
		};

		if (googleUrl === "") fetchUrl();
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const googleLoginButton = () => {
		window.location.href = googleUrl;
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
			setMessage(
				`Error submitting form: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
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
				<div className={styles.signupWrapper}>
					<p className={styles.signup}>
						Don&apos;t have an account? Sign up{" "}
						<Link href="/signup" className={styles.signupLink}>
							here
						</Link>
						.
					</p>
				</div>
				<div className={styles.altSignupWrapper}>
					<span className={styles.line} />
					<h2 className={styles.title}>Or Sign in below</h2>
					<span className={styles.line} />
				</div>
				{googleUrl !== "" ? (
					<div className={styles.altButton}>
						<button
							type="button"
							className={styles.googleButton}
							onClick={googleLoginButton}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								x="0px"
								y="0px"
								width="48"
								height="48"
								viewBox="0 0 48 48"
							>
								<title>Google Icon</title>
								<path
									fill="#FFC107"
									d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
								/>
								<path
									fill="#FF3D00"
									d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
								/>
								<path
									fill="#4CAF50"
									d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
								/>
								<path
									fill="#1976D2"
									d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
								/>
							</svg>
						</button>
					</div>
				) : (
					<div></div>
				)}
			</form>
		</div>
	);
}

export default Login;
