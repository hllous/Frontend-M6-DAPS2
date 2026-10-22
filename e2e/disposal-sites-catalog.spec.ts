import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption, openCatalogBRowDetail } from "./support/catalog-612-controls";

test.describe("DisposalSite catalog management #103", () => {
  test("Office can create, edit, and logically deactivate a disposal site", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/disposal-sites"]').click();
    await expect(page).toHaveURL(/\/app\/catalog\/disposal-sites$/);

    const code = `E2E-103-${Date.now()}`;
    const newButton = page.getByRole("button", { name: "Nuevo sitio de disposición" });
    await newButton.click();
    const createDialog = page.getByRole("dialog", { name: "Alta de sitio de disposición" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await createDialog.getByLabel("Código", { exact: true }).fill(code);
    await createDialog.getByLabel("Nombre", { exact: true }).fill("Sitio e2e de prueba");
    await createDialog.getByRole("button", { name: "Crear sitio" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(newButton).toBeFocused();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await openCatalogBRowDetail(row);
    await page.getByRole("dialog", { name: "Detalle del sitio de disposición" }).getByRole("button", { name: "Editar" }).click();
    const editDialog = page.getByRole("dialog", { name: "Editar sitio de disposición" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(editDialog.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await editDialog.getByRole("textbox", { name: "Nombre" }).fill("Sitio e2e actualizado");
    await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("row", { name: new RegExp(code) })).toContainText("Sitio e2e actualizado");

    await openCatalogBRowDetail(page.getByRole("row", { name: new RegExp(code) }));
    await page.getByRole("dialog", { name: "Detalle del sitio de disposición" }).getByRole("button", { name: "Dar de baja" }).click();
    const deactivateDialog = page.getByRole("dialog");
    await expect(deactivateDialog.getByRole("heading", { name: `Confirmar baja del sitio de disposición ${code}` })).toBeVisible();
    await deactivateDialog.getByRole("button", { name: "Dar de baja", exact: true }).click();
    await expect(page.getByText("Sitio de disposición dado de baja")).toBeVisible();
    await chooseCatalogBOption(page, page.getByRole("combobox", { name: "Filtrar sitios por estado" }), "Inactivos");
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(code) }).getByRole("button", { name: "Ver detalle del sitio de disposición " + code })).toHaveCount(1);
  });
});
