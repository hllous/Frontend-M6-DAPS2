import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    pool: "threads",
    isolate: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      ".agents/**",
      ".agents*/**",
      ".claude/**",
      ".claude*/**",
      ".codex/**",
      ".codex*/**",
      "scripts/perf/failure-probe.test.ts",
    ],
  },
});
