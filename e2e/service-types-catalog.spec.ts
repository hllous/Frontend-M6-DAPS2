import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption, openCatalogBRowDetail } from "./support/catalog-612-controls";

test.describe("ServiceType catalog management #102", () => {
  test("Office can create, edit, and logically deactivate a ServiceType while locked fields stay read-only", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("link", { name: /^Abrir/ }).first().click();
    await expect(page).toHaveURL(/\/app\/catalog\/service-types$/);

    const code = `E2E-102-${Date.now()}`;
    const newButton = page.getByRole("button", { name: "Nuevo tipo de servicio" });
    await newButton.click();
    const createDialog = page.getByRole("dialog", { name: "Alta de tipo de servicio" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await createDialog.getByLabel("Código", { exact: true }).fill(code);
    await createDialog.getByLabel("Nombre", { exact: true }).fill("Tipo e2e de prueba");
    await createDialog.getByRole("button", { name: "Crear tipo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(newButton).toBeFocused();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await openCatalogBRowDetail(row);
    await page.getByRole("dialog", { name: "Detalle del tipo de servicio" }).getByRole("button", { name: "Editar" }).click();
    const editDialog = page.getByRole("dialog", { name: "Editar tipo de servicio" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(editDialog.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await expect(editDialog.getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    await expect(editDialog.getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    await editDialog.getByRole("textbox", { name: "Nombre" }).fill("Tipo e2e actualizado");
    await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("row", { name: new RegExp(code) })).toContainText("Tipo e2e actualizado");

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
