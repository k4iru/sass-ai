import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLogger } from "@/shared/logger";

const logger = getLogger({ module: "csrf" });

/**
 * Validates the Origin header to protect against CSRF attacks.
 * Browsers always send the Origin header on cross-origin requests,
 * and it cannot be forged by JavaScript.
 *
 * Returns null if valid, or a 403 NextResponse if the check fails.
 */
export function validateOrigin(req: NextRequest): NextResponse | null {
	// Only validate state-changing methods
	if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
		return null;
	}

	const origin = req.headers.get("origin");
	const host = req.headers.get("host");

	// Server-to-server requests (no browser) won't have an Origin header.
	// Since our auth still validates JWT tokens, this is safe to allow.
	if (!origin) {
		return null;
	}

	if (!host) {
		logger.warn("CSRF check failed: missing Host header");
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const originHost = new URL(origin).host;
		if (originHost !== host) {
			logger.warn(
				`CSRF check failed: origin ${originHost} does not match host ${host}`,
			);
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
	} catch {
		logger.warn(`CSRF check failed: malformed origin header: ${origin}`);
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	return null;
}
