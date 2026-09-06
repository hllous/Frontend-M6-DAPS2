import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Vehicle catalog @smoke", () => {
  test("lists vehicles from the catalog landing", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog");
    await page.getByRole("link", { name: "Abrir catálogo" }).nth(2).click();

    await expect(page).toHaveURL(/\/app\/catalog\/vehicles$/);
    await expect(page.getByRole("heading", { name: "Vehículos" })).toBeVisible();
    await expect(page.getByText("AA 123 AA")).toBeVisible();
  });

  test("Office can register a vehicle from the catalog", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/vehicles");
    await page.getByRole("button", { name: "Registrar vehículo" }).click();
    await page.getByLabel("Patente").fill("AA 999 ZZ");
    await page.getByLabel("Capacidad").fill("5");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();

    await expect(page.getByText("AA 999 ZZ")).toBeVisible();
  });
});
