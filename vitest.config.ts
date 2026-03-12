import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: "node",
		setupFiles: ["./tests/setupEnv.ts"],
	},
	resolve: {
		alias: {
			"@/shared": path.resolve(__dirname, "shared"),
			"@/server": path.resolve(__dirname, "server"),
			"@": path.resolve(__dirname, "src"),
		},
	},
});
