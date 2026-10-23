import {
  chooseCatalogAOption,
  clickCatalogRowAction,
  openCatalogRowDetail,
} from "./support/catalog-a-controls";
import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Green Point catalog management #124", () => {
  test("Office can create, replace accepted waste types, inspect, and logically deactivate a point", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/green-points");

    await expect(page.getByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "GP-001" })).toBeVisible();

    await page.getByRole("button", { name: "Registrar punto verde" }).click();
    const dialog = page.getByRole("dialog");
    const code = `GP-E2E-${Date.now()}`;
    await dialog.getByLabel("Código").fill(code);
    await dialog.getByLabel("Nombre").fill("Punto verde e2e");
    await chooseCatalogAOption(page, dialog, "Zona operativa", { index: 1 });
    await dialog.getByRole("checkbox", { name: "Domiciliarios" }).check();
    await dialog.getByLabel("Dirección").fill("Av. E2E 124");
    await dialog.getByLabel("Latitud").fill("-34.60");
    await dialog.getByLabel("Longitud").fill("-58.38");
    await dialog.getByRole("button", { name: "Guardar punto verde" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Punto verde creado.")).toBeVisible();
    const codeButton = page.getByRole("button", { name: `Ver detalle de ${code}` });
    await expect(codeButton).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(code ?? "GP-E2E-") });
    await openCatalogRowDetail(row);
    await expect(page.getByRole("dialog")).toContainText("Domiciliarios");
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar" }).click();

    await clickCatalogRowAction(row, "Dar de baja");
    const deactivateDialog = page.getByRole("dialog");
    await expect(deactivateDialog.getByRole("heading", { name: new RegExp(`Confirmar baja del punto verde ${code}`) })).toBeVisible();
    await deactivateDialog.getByRole("button", { name: `Dar de baja el punto verde ${code}` }).click();
    await expect(page.getByText("Punto verde dado de baja")).toBeVisible();
    await chooseCatalogAOption(page, page, "Filtrar puntos verdes por estado", "Inactivos");
    await expect(page.getByRole("button", { name: `Ver detalle de ${code ?? "GP-E2E-"}` })).toBeVisible();
  });

  test("Field can inspect but cannot manage Green Points", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/green-points");
    await expect(page.getByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar punto verde" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).not.toBeVisible();
    const detail = await openCatalogRowDetail(page.getByRole("row", { name: /GP-001/ }));
    await expect(detail).toHaveAccessibleName(/Detalle del punto verde/);
    await expect(detail.getByRole("button", { name: "Editar" })).toHaveCount(0);
  });
});
