import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const CATALOG_ROUTES = [
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
] as const;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
] as const;

test.describe("catalog screens never scroll the page horizontally (#242)", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of CATALOG_ROUTES) {
      test(`/app/catalog/${route} at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await loginViaApi(page, "office-duty-queue");
        await page.goto(`/app/catalog/${route}`);
        await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
        await page.waitForLoadState("networkidle");

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth, `page is ${scrollWidth}px wide in a ${clientWidth}px viewport`).toBeLessThanOrEqual(clientWidth);
      });
    }
  }
});
