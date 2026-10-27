import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
test.describe("Crew membership management @smoke", () => {
  test("Office adds and removes members through the dedicated fixture crew", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/crews");

    const row = page.getByRole("row", { name: /Cuadrilla E - Membresia/ });
    await row.getByRole("button", { name: "Ver detalle de Cuadrilla E - Membresia" }).click();
    const dialog = page.getByRole("dialog", { name: "Detalle de cuadrilla" });
    const members = dialog.getByRole("list", { name: "Integrantes de la cuadrilla" });
    await expect(members).toContainText("Ana Morales");
    const memberPicker = dialog.getByRole("combobox", { name: /Agregar integrantes/ });
    await memberPicker.click();
    const memberSearch = page.getByRole("combobox", { name: "Buscar integrantes" });
    await memberSearch.fill("Pedro Ruiz");
    await page.getByRole("option", { name: "Pedro Ruiz, no seleccionado" }).click();
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Agregar integrantes" }).click();
    await expect(members).toContainText("Pedro Ruiz");

    await dialog.getByRole("button", { name: "Quitar a Pedro Ruiz" }).click();
    await expect(members).not.toContainText("Pedro Ruiz");
  });
});
