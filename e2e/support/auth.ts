import type { Page } from "@playwright/test";

import { AUTH_COOKIE_NAME, createSession, sealSession } from "../../src/lib/session";
import type { ScenarioId } from "../../src/lib/scenarios";

/** Drives the real login form — used by the journeys that must prove entry itself works. */
export async function loginViaUi(page: Page, scenarioLabel: string) {
  await page.goto("/login");
  await page.getByLabel("Escenario operativo").selectOption({ label: scenarioLabel });
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  await page.waitForURL("**/app");
}

/** Seeds a session cookie through the real BFF route without driving the form UI. */
export async function loginViaApi(page: Page, scenarioId: ScenarioId) {
  const response = await page.request.post("/api/session/login", {
    data: { scenarioId },
  });
  if (!response.ok()) {
    throw new Error(`Seeding a session for ${scenarioId} failed with status ${response.status()}`);
  }
}

/**
 * Builds an already-expired, correctly-sealed session cookie for the given scenario.
 * Relies on the dev server and this Node process resolving the same default session
 * secret (both fall back to it whenever NODE_ENV isn't "production").
 */
export function buildExpiredSessionCookie(scenarioId: ScenarioId, baseURL: string) {
  const nineHoursAgo = Date.now() - 9 * 60 * 60 * 1000; // past SESSION_ABSOLUTE_MS (8h)
  const session = createSession(scenarioId, { mode: "mock", now: nineHoursAgo });
  const url = new URL(baseURL);

  return {
    name: AUTH_COOKIE_NAME,
    value: sealSession(session),
    domain: url.hostname,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
  };
}
