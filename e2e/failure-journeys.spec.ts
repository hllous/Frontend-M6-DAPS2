import { expect, test } from "@playwright/test";

import { buildExpiredSessionCookie, loginViaApi } from "./support/auth";

function forbiddenScenarioEnvelope(path: string) {
  return {
    statusCode: 403,
    message: "La sesión no puede consultar este escenario.",
    error: "Forbidden",
    timestamp: new Date().toISOString(),
    path,
  };
}

test.describe("session lifecycle failure journeys @smoke", () => {
  test("a missing session redirects straight to login", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL("**/login");
  });

  test("an expired session redirects to login", async ({ page, baseURL }) => {
    await page.context().addCookies([buildExpiredSessionCookie("office-duty-queue", baseURL!)]);
    await page.goto("/app");
    await page.waitForURL("**/login");
  });

  test("a 401 on one tab logs every open tab out", async ({ browser }) => {
    const context = await browser.newContext();
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await loginViaApi(tabA, "office-duty-queue");
    await tabA.goto("/app");
    await tabB.goto("/app");
    await expect(tabA.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    await expect(tabB.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();

    await tabA.route("**/api/session", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 401,
          message: "La sesión no está activa.",
          error: "Unauthorized",
          timestamp: new Date().toISOString(),
          path: "/api/session",
        }),
      });
    });

    // The idle-activity refresh effect calls authenticatedFetch("/api/session") on the
    // first keystroke after mount, which is what turns this into a real 401 response.
    await tabA.keyboard.press("Shift");

    await tabA.waitForURL("**/login");
    await tabB.waitForURL("**/login");

    await context.close();
  });

  test("a 403 on the scenario read preserves the session instead of logging out", async ({ page }) => {
    await page.route("**/api/mock/scenarios/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify(forbiddenScenarioEnvelope(path)),
      });
    });

    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");

    await expect(page.getByText("Acceso no disponible")).toBeVisible();
    expect(page.url()).toContain("/app");
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "m6_session")).toBe(true);
  });

  test("a malformed zones response surfaces the generic error state", async ({ page }) => {
    await page.route("**/api/zones**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "not valid json" });
    });

    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();

    await expect(page.getByText("No se pudieron cargar las zonas")).toBeVisible();
  });

  test("a network failure shows a retry action that recovers on success", async ({ page }) => {
    let shouldFail = true;
    await page.route("**/api/zones**", async (route) => {
      if (shouldFail) {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();

    await expect(page.getByText("No se pudieron cargar las zonas")).toBeVisible();
    const retryButton = page.getByRole("button", { name: "Reintentar carga" });
    await expect(retryButton).toBeVisible();

    shouldFail = false;
    await retryButton.click();

    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByText("Z-01")).toBeVisible();
  });
});
