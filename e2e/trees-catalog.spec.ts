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
    const detail = page.getByRole("dialog", { name: /Detalle del árbol/ });
    await expect(detail).toContainText("Ceibo");
    await expect(page).toHaveURL(/[?&]detail=/);
    await expect(detail.getByText("Sin relevamientos registrados.")).toBeVisible();
    await expect(detail.getByRole("link", { name: "Ver en el mapa" })).toBeVisible();
    await expect(detail.getByRole("link", { name: "Ir a intervenciones de arbolado" })).toBeVisible();
    await detail.getByRole("button", { name: "Cerrar detalle" }).click();
    await expect(page).not.toHaveURL(/[?&]detail=/);
    await row.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("dialog").getByLabel("Código de relevamiento")).toBeDisabled();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await row.getByRole("button", { name: "Dar de baja" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar baja" }).click();
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

  test("Tree selection travels between the catalog detail and the map #329", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/trees");
    await page.getByRole("row", { name: /ARB-00442/ }).getByRole("button", { name: "Ver detalle" }).click();
    const detail = page.getByRole("dialog", { name: /Detalle del árbol ARB-00442/ });
    await expect(detail.getByRole("heading", { name: "Relevamientos" })).toBeVisible();
    await detail.getByRole("link", { name: "Ver en el mapa" }).click();

    await expect(page).toHaveURL(/destination=map&tree=tree-1/);
    const visibleItems = page.getByRole("region", { name: "Elementos visibles" });
    await expect(visibleItems.getByRole("button", { name: /ARB-00442/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Ver ficha del árbol ARB-00442" }).click();

    await expect(page).toHaveURL(/\/app\/catalog\/trees\?tree=tree-1&detail=tree-1/);
    await expect(page.getByRole("dialog", { name: /Detalle del árbol ARB-00442/ })).toBeVisible();
  });
});
