import { expect, test } from "@playwright/test";

import { chooseCatalogAOption } from "./support/catalog-a-controls";
import { loginViaApi } from "./support/auth";

// Eje D (XSS): un texto con HTML ingresado por el usuario se muestra literal y no ejecuta nada.

const PAYLOAD = "<img src=x onerror=window.__xss=1>";

test.describe("XSS: texto ingresado por usuarios @smoke", () => {
  test("el nombre de un punto verde con HTML se renderiza escapado", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/green-points");
    await page.getByRole("button", { name: "Registrar punto verde" }).click();

    const dialog = page.getByRole("dialog");
    const code = `GP-XSS-${Date.now()}`;
    await dialog.getByLabel("Código").fill(code);
    await dialog.getByLabel("Nombre").fill(PAYLOAD);
    await chooseCatalogAOption(page, dialog, "Zona operativa", { index: 1 });
    await dialog.getByRole("checkbox", { name: "Domiciliarios" }).check();
    await dialog.getByLabel("Dirección").fill("Av. XSS 1");
    await dialog.getByLabel("Latitud").fill("-34.60");
    await dialog.getByLabel("Longitud").fill("-58.38");
    await dialog.getByRole("button", { name: "Guardar punto verde" }).click();
    await expect(page.getByText("Punto verde creado.")).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code) });
    await expect(row).toContainText(PAYLOAD);
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    await expect(page.locator("main script")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});
