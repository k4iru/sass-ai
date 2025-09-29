import path from "node:path";
import { config } from "dotenv";
import { vi } from "vitest";

// suppress logger output during tests
// to unsuppress alter logger mock in __mocks__/@lib/logger.ts
vi.mock("@/lib/logger");

// Load .env.test file
config({ path: path.resolve(process.cwd(), ".env.test") });
