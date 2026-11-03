import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function heightOf(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.getBoundingClientRect().height);
}

test.describe("shared control density", () => {
  test("button, field, and tabs list match desktop and mobile targets at 760 px", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");

    for (const { width, height, expected } of [
      { width: 1280, height: 800, expected: 40 },
      { width: 760, height: 844, expected: 48 },
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/app?destination=services");
      await expect(page.getByRole("heading", { name: "Servicios", exact: true })).toBeVisible();

      await expect.poll(() => heightOf(page.getByRole("button", { name: "Cerrar sesión" }))).toBe(expected);
      await expect.poll(() => heightOf(page.getByRole("button", { name: "Programar servicio" }))).toBe(expected);
      await expect.poll(() => heightOf(page.getByRole("searchbox", { name: "Buscar servicios" }))).toBe(expected);

      if (width === 760) {
        await page.goto("/app?destination=dashboards");
        await expect(page.getByRole("heading", { name: "Indicadores operativos" })).toBeVisible();
        await expect.poll(() => heightOf(page.locator('[data-slot="tabs-list"]'))).toBe(expected);
      }
    }
  });
});
