// tests/setupEnv.ts

import path from "node:path";
import { config } from "dotenv";

// Load .env.test explicitly
config({ path: path.resolve(process.cwd(), ".env.test") });

// Optional: import your Zod-validated env to fail fast if something is missing
import { clientEnv, serverEnv } from "@/lib/env";
