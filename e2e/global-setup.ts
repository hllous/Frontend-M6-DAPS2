import { readdirSync } from "node:fs";
import path from "node:path";
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

// A dynamic segment (`[id]`, `[userId]`, ...) is swapped for this placeholder
// so every API route file — not just its collection root — gets requested at
// least once, regardless of what real IDs a given test suite's fixtures use.
const DYNAMIC_SEGMENT_PLACEHOLDER = "warmup-probe";

const API_ROOT = path.join(__dirname, "..", "src", "app", "api");

// Walks every `route.ts` under src/app/api and returns its request path.
// This has to stay in sync with the filesystem rather than a hand-maintained
// list: a hardcoded list of "the collection endpoints that exist today" reliably
// misses each new feature's action routes (e.g. `[id]/authorize`,
// `[id]/start-review`), and those are exactly the ones that pay a first-hit
// compile cost mid-test instead of during this warm-up.
function discoverApiRoutes(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const isDynamicSegment = entry.name.startsWith("[") && entry.name.endsWith("]");
      const segment = isDynamicSegment ? DYNAMIC_SEGMENT_PLACEHOLDER : entry.name;
      routes.push(...discoverApiRoutes(path.join(dir, entry.name), [...segments, segment]));
    } else if (/^route\.tsx?$/.test(entry.name)) {
      routes.push(`/api/${segments.join("/")}`);
    }
  }
  return routes;
}

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

    // A GET against a route file that only exports POST/PATCH/DELETE 405s —
    // but Next.js still has to compile the module to discover that, which is
    // all this warm-up needs. A GET against a route that does implement GET
    // just reads (a placeholder id 404s harmlessly), so this is safe to fire
    // uniformly across every route the filesystem knows about.
    const apiRoutes = discoverApiRoutes(API_ROOT);
    await Promise.all(apiRoutes.map((route) => context.get(route).catch(() => undefined)));
  } finally {
    await context.dispose();
  }
}
