import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Tree catalog management #126", () => {
  test("Office can create, inspect, edit mutable fields, and logically deactivate a tree", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/trees");
    await expect(page.getByRole("heading", { name: "Árboles" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ARB-00442" })).toBeVisible();

    await page.getByRole("button", { name: "Registrar árbol" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Código de relevamiento").fill(`ARB-E2E-${Date.now()}`);
    await dialog.getByLabel("Especie").fill("Ceibo");
    await dialog.getByLabel("Zona operativa").selectOption({ index: 1 });
    await dialog.getByLabel("Dirección").fill("Av. E2E 126");
    await dialog.getByLabel("Latitud").fill("-34.60");
    await dialog.getByLabel("Longitud").fill("-58.38");
    await dialog.getByLabel("Altura (m)").fill("8.5");
    await dialog.getByLabel("Diámetro (cm)").fill("26");
    await dialog.getByRole("button", { name: "Guardar árbol" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Árbol creado con éxito.")).toBeVisible();

    const row = page.locator("tbody tr").filter({ hasText: "ARB-E2E-" }).last();
    await row.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog")).toContainText("Ceibo");
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar detalle" }).click();
    await row.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("dialog").getByLabel("Código de relevamiento")).toBeDisabled();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await row.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText("Árbol dado de baja")).toBeVisible();
    await page.getByLabel("Filtrar árboles por estado").selectOption("false");
    await expect(page.getByRole("cell", { name: /ARB-E2E-/ })).toBeVisible();
  });

  test("Field can inspect but cannot manage Trees", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/trees");
    await expect(page.getByRole("heading", { name: "Árboles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar árbol" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).not.toBeVisible();
    await page.getByRole("row", { name: /ARB-00442/ }).getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog", { name: /Detalle del árbol/ })).toBeVisible();
  });
});
