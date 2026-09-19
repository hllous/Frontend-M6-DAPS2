import { defineConfig, devices } from "@playwright/test";

const PORT = 4310;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Pre-visits every route once against the freshly-started dev server so
  // the suite's own timed assertions never pay `next dev`'s on-first-request
  // JIT compile cost — see e2e/global-setup.ts. (A real production build
  // would dodge this too, but `next start` forces NODE_ENV=production,
  // which src/lib/session.ts's getAuthMode() intentionally treats as "mock
  // auth is unavailable" — a safety guard, not something to route around.)
  globalSetup: "./e2e/global-setup.ts",
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port " + PORT,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: {
          M6_AUTH_MODE: "mock",
          // MSW's service worker would otherwise intercept /api/mock/scenarios and
          // /api/zones before this suite's own fault-injection routes ever run.
          NEXT_PUBLIC_DISABLE_MSW: "true",
        },
      },
});
