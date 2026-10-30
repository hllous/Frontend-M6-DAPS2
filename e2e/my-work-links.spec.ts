import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test("Mi trabajo opens the selected report and service", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app");
  await page.locator('a[href*="detail=ER-1013"]').click();
  await expect(page.getByRole("heading", { name: /TK-2026-095/ })).toBeVisible();
  await page.getByRole("link", { name: "Mi trabajo", exact: true }).first().click();
  await page.locator('a[href*="detail=SVC-1053"]').click();
  await expect(page.getByRole("region", { name: /Detalle completo de Denuncia — acumulación/ })).toBeVisible();
});
