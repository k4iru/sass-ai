"use client";
import { createContext, useContext, useState } from "react";

const ApiUrl = process.env.NEXT_PUBLIC_API_URL;

type authContextType = {
  accessToken: string | null;
  userId: string | null;
  login: (email: string, password: string) => void;
  refreshAccessToken: () => void;
  logout: () => void;
};

const defaultAuthContextType: authContextType = {
  accessToken: null,
  userId: null,
  login: () => {},
  refreshAccessToken: () => {},
  logout: () => {},
};

const AuthContext = createContext<authContextType>(defaultAuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch(`${ApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      setAccessToken(data.accessToken);
      setUserId(data.id);
    } else {
      throw new Error(data.error);
    }

    // TODO error validation
  };

  const refreshAccessToken = async () => {
    const response = await fetch(`${ApiUrl}/api/auth/refresh-token`, {
      method: "POST",
      credentials: "include", // Include cookies in the request
    });

    console.log("in refresh access token");
    const data = await response.json();
    if (response.ok) {
      console.log("set new access Token");
      setAccessToken(data.accessToken);
      setUserId(data.id);
    } else {
      throw new Error(data.error);
    }
  };

  const logout = async () => {
    await fetch(`${ApiUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include", // Include cookies in the request
    });
    setAccessToken(null);
    setUserId(null);
  };

  return <AuthContext.Provider value={{ accessToken, userId, login, refreshAccessToken, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
