"use client";

import React, { useState } from "react";
import Form from "next/form";

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
    console.log(formData.name);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // TODO look up server actions vs restful API. leaning towards just implementing everything as restful api though.
  const handleSubmit; // do this to validate client side, then send to api end point.
  return (
    <div className="signup-form max-w-3xl bg-gray-600 mx-auto my-auto p-8 flex flex-col">
      <h1 className="text-center pt-6">Sign Up</h1>
      <Form action="/api/signup">
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
        <div className="flex flex-row">
          <button
            type="submit"
            className="border-black border-2 rounded-2xl py-2 px-4 hover:bg-gray-300 mx-auto mt-8">
            Sign Up
          </button>
        </div>
      </Form>
    </div>
  );
}

export default Signup;
