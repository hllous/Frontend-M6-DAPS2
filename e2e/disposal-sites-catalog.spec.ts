import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("DisposalSite catalog management #103", () => {
  test("Office can create, edit, and logically deactivate a disposal site", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/disposal-sites"]').click();
    await expect(page).toHaveURL(/\/app\/catalog\/disposal-sites$/);

    const code = `E2E-103-${Date.now()}`;
    await page.getByRole("button", { name: "Nuevo sitio de disposición" }).click();
    await page.getByLabel("Código", { exact: true }).fill(code);
    await page.getByLabel("Nombre", { exact: true }).fill("Sitio e2e de prueba");
    await page.getByRole("button", { name: "Crear sitio" }).click();
    await expect(page.getByText(code)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await row.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    await page.getByRole("textbox", { name: "Nombre" }).fill("Sitio e2e actualizado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Sitio e2e actualizado")).toBeVisible();

    await page.getByRole("row", { name: new RegExp(code) }).getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText("Sitio de disposición dado de baja")).toBeVisible();
    await page.getByLabel("Filtrar sitios por estado").selectOption("false");
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(code) }).getByRole("button", { name: /eliminar/i })).toHaveCount(0);
  });
});
