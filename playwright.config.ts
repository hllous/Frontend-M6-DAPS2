import { defineConfig, devices } from "@playwright/test";

const PORT = 4310;
const REAL_M1_PORT = 4311;
const FAKE_M1_PORT = 4312;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${PORT}`;
const realM1BaseURL = process.env.PLAYWRIGHT_REAL_M1_BASE_URL ?? externalBaseURL ?? `http://127.0.0.1:${REAL_M1_PORT}`;
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
      testIgnore: "**/real-m1-login.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "real-m1",
      testMatch: "**/real-m1-login.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: realM1BaseURL },
    },
  ],
  // Pre-visits every route once against the freshly-started dev server so
  // the suite's own timed assertions never pay `next dev`'s on-first-request
  // JIT compile cost — see e2e/global-setup.ts. (A real production build
  // would dodge this too, but `next start` forces NODE_ENV=production, and a
  // deployed build only starts with M6_AUTH_MODE=real-m1 (src/instrumentation.ts,
  // getAuthMode() is real-m1 unconditionally in production) — a safety
  // guard, not something to route around.)
  globalSetup: "./e2e/global-setup.ts",
  webServer: externalBaseURL || process.env.PLAYWRIGHT_REAL_M1_BASE_URL
    ? undefined
    : [
        {
          command: "pnpm dev:fake-m1",
          port: FAKE_M1_PORT,
          name: "Fake M1",
          reuseExistingServer: !isCI,
          timeout: 120_000,
          env: { FAKE_M1_PORT: String(FAKE_M1_PORT) },
        },
        {
          command: "pnpm dev --port " + PORT,
          url: baseURL,
          name: "Mock frontend",
          reuseExistingServer: !isCI,
          timeout: 120_000,
          env: {
            M6_AUTH_MODE: "mock",
            M6_NEXT_DIST_DIR: ".next-e2e-mock",
            // MSW's service worker would otherwise intercept /api/mock/scenarios and
            // /api/zones before this suite's own fault-injection routes ever run.
            NEXT_PUBLIC_DISABLE_MSW: "true",
          },
        },
        {
          command: "pnpm dev --port " + REAL_M1_PORT,
          url: realM1BaseURL,
          name: "Real-M1 frontend",
          reuseExistingServer: !isCI,
          timeout: 120_000,
          env: {
            M6_AUTH_MODE: "real-m1",
            M1_BASE_URL: `http://127.0.0.1:${FAKE_M1_PORT}/api/v1/`,
            M1_FAKE_ENABLED: "true",
            M6_BACKEND_ORIGIN: "http://m6-demo-backend.invalid",
            M6_REAL_M1_MOCK_BACKEND: "true",
            M6_NEXT_DIST_DIR: ".next-e2e-real-m1",
            NODE_OPTIONS: "--import=./scripts/msw-real-m1-backend.mjs",
            NEXT_PUBLIC_DISABLE_MSW: "true",
          },
        },
      ],
});
