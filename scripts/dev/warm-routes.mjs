import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

import { createLocalMockWarmupCookie } from "../../src/lib/session-cookie.mjs";
import { DEV_SERVER_ENV } from "./server-config.mjs";

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
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const { loadEnvConfig } = nextEnv;

/**
 * @param {import("@playwright/test").APIRequestContext} context
 * @param {{
 *   timeoutMs?: number,
 *   baseURL?: string,
 *   environment?: { NODE_ENV?: string, M6_AUTH_MODE?: string, M6_SESSION_SECRET?: string }
 * }} [options]
 */
export async function warmMainRoutes(context, {
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  baseURL,
  environment: providedEnvironment,
} = {}) {
  const pageRoutes = [
    "/login",
    "/app",
    "/app/dashboard",
    ...CATALOG_SLUGS.map((slug) => `/app/catalog/${slug}`),
  ];

  let origin;
  try {
    origin = baseURL ? new URL(baseURL) : null;
  } catch {
    origin = null;
  }
  const isLocalOrigin = origin && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(origin.hostname);
  if (!isLocalOrigin) {
    return {
      pageRouteCount: pageRoutes.length,
      warmedRouteCount: 0,
      failedPageRoutes: pageRoutes.map((route) => ({ route, error: "page warm-up requires a localhost target" })),
    };
  }

  let environment;
  try {
    environment = providedEnvironment ?? loadLocalDevelopmentEnvironment();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      pageRouteCount: pageRoutes.length,
      warmedRouteCount: 0,
      failedPageRoutes: pageRoutes.map((route) => ({ route, error: `could not load local environment: ${message}` })),
    };
  }

  const refusal = environment.NODE_ENV === "production"
    ? "page warm-up is available only in local development"
    : null;
  if (refusal) {
    return {
      pageRouteCount: pageRoutes.length,
      warmedRouteCount: 0,
      failedPageRoutes: pageRoutes.map((route) => ({ route, error: refusal })),
    };
  }

  let warmupCookie;
  let authError;
  try {
    warmupCookie = createLocalMockWarmupCookie(environment);
  } catch (error) {
    authError = error instanceof Error ? error.message : String(error);
  }
  if (!warmupCookie) {
    return {
      pageRouteCount: pageRoutes.length,
      warmedRouteCount: 0,
      failedPageRoutes: pageRoutes.map((route) => ({ route, error: authError ?? "could not create local mock session" })),
    };
  }

  const results = await Promise.all(pageRoutes.map(async (route) => {
    const isProtectedPage = route.startsWith("/app/") || route === "/app";

    try {
      const response = await getPageResponse(context, new URL(route, baseURL), {
        timeoutMs,
        cookie: isProtectedPage ? warmupCookie : undefined,
        protectedPage: isProtectedPage,
        origin,
      });
      if (!response.ok) return { route, error: response.error };
      return { route, error: null };
    } catch (error) {
      return { route, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  const failedPageRoutes = results.filter((result) => result.error !== null);
  return {
    pageRouteCount: pageRoutes.length,
    warmedRouteCount: pageRoutes.length - failedPageRoutes.length,
    failedPageRoutes,
  };
}

function loadLocalDevelopmentEnvironment() {
  loadEnvConfig(projectRoot, true);
  return { ...process.env, ...DEV_SERVER_ENV };
}

async function getPageResponse(context, initialUrl, { timeoutMs, cookie, protectedPage, origin }) {
  if (!initialUrl || !origin) return { ok: false, error: "missing localhost base URL" };

  let target = initialUrl;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await context.get(target.toString(), {
      timeout: timeoutMs,
      maxRedirects: 0,
      headers: cookie ? { cookie } : undefined,
    });

    if (response.status() >= 300 && response.status() < 400) {
      const location = response.headers().location;
      if (!location) return { ok: false, error: `returned redirect ${response.status()} without a location` };
      const next = new URL(location, target);
      if (next.origin !== origin.origin) return { ok: false, error: "redirected outside the localhost origin" };
      if (protectedPage && next.pathname === "/login") return { ok: false, error: "redirected to /login" };
      if (redirects === 5) return { ok: false, error: "exceeded the page redirect limit" };
      target = next;
      continue;
    }

    if (!response.ok()) return { ok: false, error: `returned ${response.status()}` };
    if (protectedPage && target.pathname === "/login") return { ok: false, error: "resolved to /login" };
    const contentType = response.headers()["content-type"]?.split(";")[0].trim().toLowerCase();
    if (contentType !== "text/html") return { ok: false, error: "returned a non-HTML response" };
    const html = await response.text();
    if (!/<body\b/i.test(html) || !/<\/html>/i.test(html)) {
      return { ok: false, error: "did not render an HTML page" };
    }
    return { ok: true };
  }

  return { ok: false, error: "exceeded the page redirect limit" };
}
