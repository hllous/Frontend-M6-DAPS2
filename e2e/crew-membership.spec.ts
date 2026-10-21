import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption } from "./support/catalog-612-controls";

test.describe("Crew membership management @smoke", () => {
  test("Office adds and removes members through the dedicated fixture crew", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/crews");

    const row = page.getByRole("row", { name: /Cuadrilla E - Membresia/ });
    await row.getByRole("button", { name: "Ver detalle" }).click();
    const dialog = page.getByRole("dialog");
    const members = dialog.getByRole("list", { name: "Integrantes de la cuadrilla" });
    await expect(members).toContainText("Ana Morales");
    await chooseCatalogBOption(page, dialog.getByRole("combobox", { name: "Agregar integrantes (M1)" }), "Pedro Ruiz");
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Agregar integrantes" }).click();
    await expect(members).toContainText("Pedro Ruiz");

    await dialog.getByRole("button", { name: "Quitar a Pedro Ruiz" }).click();
    await expect(members).not.toContainText("Pedro Ruiz");
  });
});
