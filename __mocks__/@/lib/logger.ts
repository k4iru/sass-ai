import { vi } from "vitest";
import type * as actualLoggerModule from "@/lib/logger";

vi.mock("@/lib/logger", async () => {
	const actual: typeof actualLoggerModule =
		await vi.importActual("@/lib/logger");

	return {
		...actual,
		logger: {
			...actual.logger,
			debug: vi.fn(), // mock debug
			warn: vi.fn(), // mock warn
			error: vi.fn(), // mock error
			logger: vi.fn(),
			// keep info as-is
			//info: actual.logger.info,
		},
		getLogger: (context: Record<string, unknown> = {}) => {
			const realChild = actual.getLogger(context);
			return {
				...realChild,
				debug: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				logger: vi.fn(),
				//info: realChild.info, // keep info
			};
		},
	};
});
