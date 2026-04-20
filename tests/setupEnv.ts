import path from "node:path";
import { config } from "dotenv";
import { vi } from "vitest";

// suppress logger output during tests
vi.mock("@/shared/logger", async () => {
	const actual = await vi.importActual<typeof import("@/shared/logger")>("@/shared/logger");
	const noop = vi.fn();
	return {
		...actual,
		logger: {
			...actual.logger,
			debug: noop,
			warn: noop,
			error: noop,
		},
		getLogger: (context: Record<string, unknown> = {}) => {
			const child = actual.getLogger(context);
			return {
				...child,
				debug: noop,
				warn: noop,
				error: noop,
			};
		},
	};
});

// Load .env.test file
config({ path: path.resolve(process.cwd(), ".env.test") });
