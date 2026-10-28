import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogOption } from "./support/catalog-611-controls";

async function openZonesCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/zones");
}

test.describe("Zone catalog management #106", () => {
  test("Office actor lists zones and filters by active status and search", async ({ page }) => {
    await openZonesCatalog(page);

    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    // 48 zonas, una por barrio: el nombre y la comuna se ven, el código interno no.
    const belgrano = page.getByRole("row", { name: /Belgrano/ });
    const palermo = page.getByRole("row", { name: /Palermo/ });
    await expect(belgrano).toBeVisible();
    await expect(belgrano.getByRole("cell", { name: "Comuna 13" })).toBeVisible();
    await expect(palermo.getByRole("cell", { name: "Comuna 14" })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(49);

    await chooseCatalogOption(page, "Filtrar por estado", "Activas");
    await expect(palermo).toBeVisible();

    await chooseCatalogOption(page, "Filtrar por estado", "Todos");

    // Filter by search
    const searchInput = page.getByLabel("Buscar zona");
    await searchInput.fill("lerm");
    await expect(palermo).toBeVisible();
    await expect(belgrano).toHaveCount(0);

    // Clear search
    await searchInput.fill("");
    await expect(belgrano).toBeVisible();
  });

  test("Office actor creates a new zone and it appears in the catalog", async ({ page }) => {
    await openZonesCatalog(page);

    await page.getByRole("button", { name: "Nueva zona" }).click();
    await expect(page.getByRole("heading", { name: "Nueva zona operativa" })).toBeVisible();

    await page.getByLabel("Código").fill("Z-90");
    await page.getByLabel("Nombre").fill("Zona Cordón Industrial");

    await page.getByRole("button", { name: "Crear zona" }).click();

        await expect(page.getByText("Zona Cordón Industrial")).toBeVisible();
  });

  test("Office actor edits a zone and observes that code is immutable", async ({ page }) => {
    await openZonesCatalog(page);

    // Find the row for Palermo and click Editar
    const row = page.locator("tr", { hasText: "Palermo" });
    await row.getByRole("button", { name: "Editar" }).click();

    await expect(page.getByRole("heading", { name: "Editar zona operativa" })).toBeVisible();

    // Verify code input is read-only
    const codeInput = page.getByLabel(/Código/i);
    await expect(codeInput).toHaveAttribute("readonly");
    await expect(codeInput).toHaveValue("palermo");

    // Edit name
    const nameInput = page.getByLabel("Nombre");
    await nameInput.fill("Palermo Parque Industrial");

    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Palermo Parque Industrial")).toBeVisible();
  });

  test("Deactivating a referenced zone shows confirmation warning with references before allowing deactivation", async ({
    page,
  }) => {
    await openZonesCatalog(page);

    // Belgrano has references
    const row = page.locator("tr", { hasText: "Belgrano" });
    await row.getByRole("button", { name: "Dar de baja" }).click();

    // Confirmation dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Dar de baja la zona Belgrano" })).toBeVisible();
    await expect(dialog.getByText("La zona está en uso:")).toBeVisible();
    await expect(dialog.getByText(/backend/i)).toHaveCount(0);

    // Confirm deactivation
    await dialog.getByRole("button", { name: "Dar de baja la zona Belgrano" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(row.getByText("Inactiva")).toBeVisible();
  });

  test("Office actor assigns and removes neighborhoods from a zone", async ({ page }) => {
    await openZonesCatalog(page);

    const row = page.locator("tr", { hasText: "Belgrano" });
    await row.getByRole("button", { name: "Barrios" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Barrios", level: 2 })).toBeVisible();
    const assigned = dialog.getByRole("list", { name: "Barrios" });
    await expect(assigned.getByText("Belgrano")).toBeVisible();

    // Catálogo de M9 agrupado por comuna: Recoleta está en la Comuna 2.
    await dialog.getByLabel("Buscar barrios").fill("Recol");
    await dialog.getByRole("group", { name: "Comuna 2" }).getByRole("checkbox", { name: "Recoleta" }).click();
    await expect(dialog.getByText("1 seleccionado")).toBeVisible();
    await dialog.getByRole("button", { name: "Asignar seleccionados" }).click();

    await expect(page.getByText("Barrios asignados correctamente.")).toBeVisible();
    await expect(assigned.getByText("Recoleta")).toBeVisible();
    await expect(dialog.getByText("Ya asignado")).toBeVisible();

    await dialog.getByRole("button", { name: "Quitar Recoleta" }).click();
    await expect(page.getByText("Barrio quitado de la zona.")).toBeVisible();
  });
});
