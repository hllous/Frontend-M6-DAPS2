import {
  chooseCatalogAOption,
  clickCatalogRowAction,
  openCatalogRowDetail,
} from "./support/catalog-a-controls";
import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Green Spaces catalog management @smoke", () => {
  test("Office can filter, create, edit, and deactivate a GreenSpace without action controls", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=catalog");
    await page.getByRole("listitem").filter({ hasText: "Espacios verdes" }).getByRole("link", { name: "Abrir catálogo" }).click();

    const panel = page.locator('section[aria-labelledby="green-spaces-title"]');
    await expect(panel.getByRole("heading", { name: "Espacios verdes" })).toBeVisible();
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();

    await chooseCatalogAOption(page, panel, "Tipo de espacio", "Parque");
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();
    await expect(panel.getByText("Cantero Central")).not.toBeVisible();
    await chooseCatalogAOption(page, panel, "Tipo de espacio", "Todos los tipos");

    const name = "Espacio E2E #108";
    await panel.getByRole("button", { name: "Registrar espacio verde" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre").fill(name);
    await chooseCatalogAOption(page, dialog, "Tipo de espacio en el formulario", "Plaza");
    await dialog.getByLabel("Superficie (m²)").fill("275");
    await chooseCatalogAOption(page, dialog, "Zona en el formulario", "Belgrano");
    await dialog.getByRole("button", { name: "Guardar espacio verde" }).click();
    await expect(dialog).not.toBeVisible();

    const createdRow = panel.getByRole("row", { name: new RegExp(name) });
    await expect(createdRow).toBeVisible();
    await clickCatalogRowAction(createdRow, "Editar");
    await page.getByRole("dialog").getByLabel("Nombre").fill("Espacio E2E editado #108");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar espacio verde" }).click();
    const editedRow = panel.getByRole("row", { name: /Espacio E2E editado #108/ });
    await expect(editedRow).toBeVisible();

    await clickCatalogRowAction(editedRow, "Dar de baja");
    const deactivateDialog = page.getByRole("dialog");
    await expect(deactivateDialog.getByRole("heading", { name: "Confirmar baja del espacio verde Espacio E2E editado #108" })).toBeVisible();
    await deactivateDialog.getByRole("button", { name: "Dar de baja el espacio verde Espacio E2E editado #108" }).click();
    await expect(editedRow.getByText("Inactivo")).toBeVisible();
    await expect(panel.getByRole("button", { name: /regar|regar|cortar|riego|corte/i })).toHaveCount(0);
  });

  test("Field can consult GreenSpaces but cannot manage them", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app?destination=catalog");
    await page.getByRole("listitem").filter({ hasText: "Espacios verdes" }).getByRole("link", { name: "Abrir catálogo" }).click();

    const panel = page.locator('section[aria-labelledby="green-spaces-title"]');
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Registrar espacio verde" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
    const detail = await openCatalogRowDetail(panel.getByRole("row", { name: /Parque del Bicentenario/ }));
    await expect(detail.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
  });
});
