import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseServicesPeriod, expectServicesPeriod } from "./support/services-627-controls";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Services period selector changes the window and the URL at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();

    await chooseServicesPeriod(page, "Este mes");
    await expectServicesPeriod(page, "Este mes");
    await expect(page).toHaveURL(/periodo=mes/);

    await chooseServicesPeriod(page, "Todo el período");
    await expectServicesPeriod(page, "Todo el período");
  });
}
