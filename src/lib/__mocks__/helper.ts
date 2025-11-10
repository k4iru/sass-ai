import { vi } from "vitest";

export const getApiKey = vi.fn();
export const getClientIP = vi.fn().mockReturnValue("client-ip-string");
export const deleteRefreshToken = vi.fn().mockResolvedValue(true);
export const generateRefreshToken = vi
	.fn()
	.mockResolvedValue("new-refresh-token");
export const getRefreshToken = vi.fn().mockResolvedValue(null);
export const insertRefreshToken = vi.fn().mockResolvedValue(true);
