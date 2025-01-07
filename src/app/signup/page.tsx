"use client";

import React, { FormEvent, useState } from "react";
import Form from "next/form";
import { signupSchema } from "@/lib/validation/signupSchema";
import next from "next";

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    console.log(formData.name);
    console.log(formData.email);
    console.log(formData.password);
  };

  const testSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("test 3");
    try {
      console.log("test 4");
      const response = await fetch("/api/form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log("test1");
      } else {
        console.log("test 2");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // TODO look up server actions vs restful API. leaning towards just implementing everything as restful api though.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    // set up
    console.log("in submit");
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    console.log("test");
    console.log("in handleSubmit");

    // Handle client validation use zod
    const validationResult = signupSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message).join(", ");
      setMessage(errors);
      setLoading(false); // Stop loading if validation fails
      console.log(errors);
      return;
    }

    setMessage("success");

    // handle post

    // handle message
  };
  return (
    <div className="signup-form max-w-3xl bg-gray-600 mx-auto my-auto p-8 flex flex-col">
      <h1 className="text-center pt-6">Sign Up</h1>
      <form onSubmit={testSubmit}>
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
