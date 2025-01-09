"use client";

import React, { FormEvent, useState } from "react";
import { signupSchema } from "@/lib/validation/signupSchema";
import { redirect } from "next/navigation";

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordVerification: "",
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

    // check passwords match
    if (formData.password !== formData.passwordVerification) {
      setMessage("Passwords don't match");
      setLoading(false);
      return;
    }

    // Handle client validation use zod. Remember to also validate server side as well.
    const validationResult = signupSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message).join(", ");
      setMessage(errors);
      setLoading(false); // Stop loading if validation fails
      return;
    }

    // handle post
    try {
      const response = await fetch("/api/auth/signup", {
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
    } catch (error) {
      setMessage("Error submitting form.");
      setLoading(false);

      return;
    }

    // since redirect throws an error this needs to be outside the try catch block.
    setLoading(false);
    redirect("/dashboard");
    return;

    // handle message
  };
  return (
    <div className="signup-form max-w-3xl bg-gray-600 mx-auto my-auto p-8 flex flex-col">
      <h1 className="text-center pt-6">Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            className="bg-gray-400 rounded-md ml-2 mb-2"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
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
        <div>
          <label htmlFor="passwordVerification">Verify Password:</label>
          <input
            className="bg-gray-400 rounded-md ml-2 mb-2"
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
            className="border-black border-2 rounded-2xl py-2 px-4 hover:bg-gray-300 mx-auto mt-8">
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}

export default Signup;
