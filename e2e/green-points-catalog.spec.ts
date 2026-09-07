import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Green Point catalog management #124", () => {
  test("Office can create, replace accepted waste types, inspect, and logically deactivate a point", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/green-points");

    await expect(page.getByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    await expect(page.getByText("GP-001")).toBeVisible();

    await page.getByRole("button", { name: "Registrar punto verde" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Código").fill(`GP-E2E-${Date.now()}`);
    await dialog.getByLabel("Nombre").fill("Punto verde e2e");
    await dialog.getByLabel("Zona operativa").selectOption({ index: 1 });
    await dialog.getByLabel("Domiciliarios").check();
    await dialog.getByLabel("Dirección").fill("Av. E2E 124");
    await dialog.getByLabel("Latitud").fill("-34.60");
    await dialog.getByLabel("Longitud").fill("-58.38");
    await dialog.getByRole("button", { name: "Guardar punto verde" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Punto verde creado con éxito.")).toBeVisible();
    const code = await page.locator("tbody tr").last().locator("td").first().textContent();
    expect(code).toMatch(/^GP-E2E-/);

    const row = page.getByRole("row", { name: new RegExp(code ?? "GP-E2E-") });
    await row.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog")).toContainText("Domiciliarios");
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar detalle" }).click();

    await row.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText("Punto verde dado de baja")).toBeVisible();
    await page.getByLabel("Filtrar puntos verdes por estado").selectOption("false");
    await expect(page.getByText(code ?? "GP-E2E-")).toBeVisible();
  });

  test("Field can inspect but cannot manage Green Points", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/green-points");
    await expect(page.getByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar punto verde" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).not.toBeVisible();
    await page.getByRole("row", { name: /GP-001/ }).getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog", { name: /Detalle del punto verde/ })).toBeVisible();
  });
});
