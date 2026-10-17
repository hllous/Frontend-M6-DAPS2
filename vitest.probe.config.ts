import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/perf/failure-probe.test.ts"],
    exclude: [],
    environment: "node",
  },
});
