import { vi } from "vitest";

export const generateAccessToken = vi
	.fn()
	.mockResolvedValue("new-access-token");

export const getUserSubFromJWT = vi.fn().mockReturnValue("user-id-string");
