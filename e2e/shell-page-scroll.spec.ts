import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// On desktop the app shell is exactly one viewport tall and `main` scrolls inside it,
// so the page itself must never scroll: anything taller is a blank strip under the shell.
const ROUTES = [
  "/app?destination=work",
  "/app?destination=services",
  "/app?destination=map",
  "/app?destination=dashboards",
  "/app/dashboard",
  "/app/catalog",
  "/app/catalog/containers",
  "/app/catalog/crews",
  "/app/catalog/disposal-sites",
  "/app/catalog/green-points",
  "/app/catalog/green-spaces",
  "/app/catalog/routes",
  "/app/catalog/service-frequencies",
  "/app/catalog/service-types",
  "/app/catalog/tree-interventions",
  "/app/catalog/trees",
  "/app/catalog/vehicles",
  "/app/catalog/zones",
  "/app/access",
  "/app/admin/integration-monitor",
] as const;

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
] as const;

test.describe("desktop shell never scrolls the page past the shell", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route} at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginViaApi(page, "office-duty-queue");
        await page.goto(route);
        await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
        await page.waitForLoadState("networkidle");

        const { scrollHeight, clientHeight } = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
        }));
        expect(scrollHeight, `page is ${scrollHeight}px tall in a ${clientHeight}px viewport`).toBeLessThanOrEqual(clientHeight);
      });
    }
  }
});
