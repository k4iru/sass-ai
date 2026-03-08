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

export const authenticateWebSocket = async (
	req: IncomingMessage,
): Promise<boolean> => {
	const logger = getLogger({ module: "webSocketAuthentication" });

	logger.info("Authenticating WebSocket connection");
	const cookies = parseCookies(req.headers.cookie);
	const accessToken = cookies.accessToken;
	const refreshToken = cookies.refreshToken;

	logger.debug("Access Token: %s", accessToken);
	logger.debug("Refresh Token: %s", refreshToken);

	// validate both tokens.
	// check for valid session in refresh database
	return false;
};
