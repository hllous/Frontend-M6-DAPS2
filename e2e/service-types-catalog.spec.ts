import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption, openCatalogBRowDetail } from "./support/catalog-612-controls";

test.describe("ServiceType catalog management #102", () => {
  test("Office can create, edit, and logically deactivate a ServiceType while locked fields stay read-only", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Catálogo" }).click();
    await page.getByRole("link", { name: "Abrir catálogo" }).first().click();
    await expect(page).toHaveURL(/\/app\/catalog\/service-types$/);

    const code = `E2E-102-${Date.now()}`;
    await page.getByRole("button", { name: "Nuevo tipo de servicio" }).click();
    await page.getByLabel("Código", { exact: true }).fill(code);
    await page.getByLabel("Nombre", { exact: true }).fill("Tipo e2e de prueba");
    await page.getByRole("button", { name: "Crear tipo" }).click();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await openCatalogBRowDetail(row);
    await page.getByRole("dialog", { name: "Detalle del tipo de servicio" }).getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await expect(page.getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    await expect(page.getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    await page.getByRole("textbox", { name: "Nombre" }).fill("Tipo e2e actualizado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Tipo e2e actualizado")).toBeVisible();

    const updatedRow = page.getByRole("row", { name: new RegExp(code) });
    await openCatalogBRowDetail(updatedRow);
    await page.getByRole("dialog", { name: "Detalle del tipo de servicio" }).getByRole("button", { name: "Dar de baja" }).click();
    const deactivateDialog = page.getByRole("dialog");
    await expect(deactivateDialog.getByRole("heading", { name: `Confirmar baja del tipo de servicio ${code}` })).toBeVisible();
    await deactivateDialog.getByRole("button", { name: "Dar de baja", exact: true }).click();
    await expect(page.getByText("Tipo de servicio dado de baja")).toBeVisible();
    await chooseCatalogBOption(page, page.getByRole("combobox", { name: "Filtrar por estado" }), "Inactivos");
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(code) }).getByRole("button", { name: `Ver detalle del tipo de servicio ${code}` })).toHaveCount(1);
  });
});
