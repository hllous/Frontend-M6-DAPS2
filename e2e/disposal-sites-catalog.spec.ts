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
    await page.getByRole("button", { name: "Nuevo sitio de disposición" }).click();
    await page.getByLabel("Código", { exact: true }).fill(code);
    await page.getByLabel("Nombre", { exact: true }).fill("Sitio e2e de prueba");
    await page.getByRole("button", { name: "Crear sitio" }).click();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await openCatalogBRowDetail(row);
    await page.getByRole("dialog", { name: "Detalle del sitio de disposición" }).getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await page.getByRole("textbox", { name: "Nombre" }).fill("Sitio e2e actualizado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Sitio e2e actualizado")).toBeVisible();

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
