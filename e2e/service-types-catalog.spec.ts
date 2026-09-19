import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("ServiceType catalog management #102", () => {
  test("Office can create, edit, and logically deactivate a ServiceType while locked fields stay read-only", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();
    await page.getByRole("link", { name: "Abrir catálogo" }).first().click();
    await expect(page).toHaveURL(/\/app\/catalog\/service-types$/);

    const code = `E2E-102-${Date.now()}`;
    await page.getByRole("button", { name: "Nuevo tipo de servicio" }).click();
    await page.getByLabel("Código", { exact: true }).fill(code);
    await page.getByLabel("Nombre", { exact: true }).fill("Tipo e2e de prueba");
    await page.getByRole("button", { name: "Crear tipo" }).click();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await row.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await expect(page.getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    await expect(page.getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    await page.getByRole("textbox", { name: "Nombre" }).fill("Tipo e2e actualizado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tipo e2e actualizado")).toBeVisible();

    const updatedRow = page.getByRole("row", { name: new RegExp(code) });
    await updatedRow.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText("Tipo de servicio dado de baja")).toBeVisible();
    await page.getByLabel("Filtrar por estado").selectOption("false");
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(code) }).getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  });
});
