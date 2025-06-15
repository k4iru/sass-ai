"use client";

import type React from "react";
import { type FormEvent, useState } from "react";
// import { signupSchema } from "@/lib/validation/signupSchema";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function Login() {
	const router = useRouter();
	const { login } = useAuth();
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

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
		router.replace("/chat");
		return;

		// handle message
	};
	return (
		<div className="signup-form max-w-3xl bg-gray-600 mx-auto my-auto p-8 flex flex-col">
			<h1 className="text-center pt-6">Login</h1>
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="email">Email:</label>
					<input
						className="bg-gray-400 rounded-md ml-2 mb-2"
						type="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required
					/>
				</div>
				<div>
					<label htmlFor="password">Password:</label>
					<input
						className="bg-gray-400 rounded-md ml-2 mb-2"
						type="password"
						name="password"
						value={formData.password}
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
						Login
					</button>
				</div>
			</form>
		</div>
	);
}

export default Login;
