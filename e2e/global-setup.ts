import { request, type FullConfig } from "@playwright/test";

// `next dev` compiles each route lazily, on the server, the first time any
// client (browser or plain HTTP) requests it — so a lightweight request
// context is enough to force the compile without spinning up a browser.
// Runs once, right after the dev server reports ready, before any timed
// test assertion — see the comment on `globalSetup` in playwright.config.ts.

const CATALOG_SLUGS = [
  "containers",
  "crews",
  "disposal-sites",
  "green-points",
  "green-spaces",
  "routes",
  "service-frequencies",
  "service-types",
  "tree-interventions",
  "trees",
  "vehicles",
  "zones",
];

const API_COLLECTION_PATHS = [
  "containers",
  "crews",
  "disposal-sites",
  "environmental-inspections",
  "environmental-reports",
  "green-points",
  "green-spaces",
  "indicators/services",
  "mock/scenarios",
  "referrals",
  "repair-requests",
  "routes",
  "service-frequencies",
  "service-types",
  "services",
  "street-closure-requests",
  "tree-interventions",
  "trees",
  "vehicles",
  "zones",
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;

  const context = await request.newContext({ baseURL });
  try {
    // Seeds a session cookie so subsequent warm-up requests to authenticated
    // routes render their real page/handler instead of bouncing off a
    // login redirect that never reaches (and so never compiles) them.
    await context.post("/api/session/login", { data: { scenarioId: "office-duty-queue" } });

    await context.get("/login").catch(() => undefined);
    await context.get("/app").catch(() => undefined);
    await context.get("/app/dashboard").catch(() => undefined);

    await Promise.all(
      CATALOG_SLUGS.map((slug) => context.get(`/app/catalog/${slug}`).catch(() => undefined)),
    );
    await Promise.all(
      API_COLLECTION_PATHS.map((path) => context.get(`/api/${path}`).catch(() => undefined)),
    );
  } finally {
    await context.dispose();
  }
}
