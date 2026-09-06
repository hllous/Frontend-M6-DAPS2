import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Crew catalog @smoke", () => {
  test("opens the crew catalog from the landing page", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/crews"]').click();

    await expect(page).toHaveURL(/\/app\/catalog\/crews$/);
    await expect(page.getByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    await expect(page.getByText("Cuadrilla A · López")).toBeVisible();
    await expect(page.getByText("Carlos López")).toBeVisible();
  });

  test("Field sees only its assigned crew detail", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app/catalog/crews");

    await expect(page.getByText("Cuadrilla B · Fernández")).toBeVisible();
    await expect(page.getByText("Cuadrilla A · López")).not.toBeVisible();
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog")).toContainText("Integrantes");
  });
});
