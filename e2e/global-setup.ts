import { request, type FullConfig } from "@playwright/test";

// `next dev` compiles each route lazily, on the server, the first time any
// client (browser or plain HTTP) requests it — so a lightweight request
// context is enough to force the compile without spinning up a browser.
// Runs once, right after the dev server reports ready, before any timed
// test assertion — see the comment on `globalSetup` in playwright.config.ts.

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;

  const { warmMainRoutes } = await import("../scripts/dev/warm-routes.mjs");
  const context = await request.newContext({ baseURL });
  try {
    // API action routes can mutate mock state, so warm only read-only page GETs.
    const result = await warmMainRoutes(context, { baseURL });
    for (const failure of result.failedPageRoutes) {
      console.warn(`e2e page route warm-up skipped ${failure.route}: ${failure.error}`);
    }
  } finally {
    await context.dispose();
  }
}
