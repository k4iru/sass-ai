import type { IncomingMessage } from "http";
import { getLogger } from "@/shared/logger";

export const parseCookies = (
	cookieHeader: string | undefined,
): {
	[key: string]: string;
} => {
	if (!cookieHeader) return {};

	return Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [key, ...v] = c.trim().split("=");
			return [key, v.join("=")];
		}),
	);
};

export const authenticateViaHttpToken = async (
	token: string,
	apiUrl: string,
): Promise<{ userId: string; chatId: string } | null> => {
	const res = await fetch(`${apiUrl}/api/auth/verify-ws-token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token }),
	});
	if (!res.ok) return null;
	return res.json();
};
