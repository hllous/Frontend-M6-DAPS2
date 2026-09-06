import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("ServiceFrequency rule authoring #112", () => {
  test("Office creates, edits, and closes a rule without a generation action", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/service-frequencies"]').click();
    await expect(page).toHaveURL(/\/app\/catalog\/service-frequencies$/);

    await expect(page.getByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    await expect(page.getByRole("button", { name: /generar/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Nueva frecuencia" }).click();
    await expect(page.getByRole("combobox", { name: "Tipo de servicio" })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Tipo de servicio" })).not.toContainText("Mantenimiento de contenedores");
    await page.getByRole("combobox", { name: "Tipo de servicio" }).selectOption("st-waste-route");
    await page.getByRole("combobox", { name: "Recorrido" }).selectOption("route-1");
    await page.getByLabel("Válida desde").fill("2026-09-07");
    await page.getByRole("button", { name: "Crear frecuencia" }).click();
    await expect(page.getByText(/Frecuencia creada/)).toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: "Recolección domiciliaria" }).last();
    await createdRow.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Turno").last().selectOption("AFTERNOON");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText(/Frecuencia actualizada/)).toBeVisible();

    const updatedRow = page.getByRole("row").filter({ hasText: "Recolección domiciliaria" }).last();
    await updatedRow.getByRole("button", { name: "Cerrar vigencia" }).click();
    await expect(page.getByRole("heading", { name: "Cerrar vigencia" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar vigencia" }).last().click();
    await expect(page.getByText(/Vigencia cerrada/)).toBeVisible();
  });
});
