import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function openZonesCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/zones");
}

test.describe("Zone catalog management #106", () => {
  test("Office actor lists zones and filters by active status and search", async ({ page }) => {
    await openZonesCatalog(page);

    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByText("Z-01")).toBeVisible();
    await expect(page.getByText("Zona Norte")).toBeVisible();
    await expect(page.getByText("Z-02")).toBeVisible();

    // Filter by search
    const searchInput = page.getByLabel("Buscar zonas operativas");
    await searchInput.fill("Sur");
    await expect(page.getByText("Z-02")).toBeVisible();
    await expect(page.getByText("Zona Norte")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("Zona Norte")).toBeVisible();
  });

  test("Office actor creates a new zone and it appears in the catalog", async ({ page }) => {
    await openZonesCatalog(page);

    await page.getByRole("button", { name: "Nueva zona" }).click();
    await expect(page.getByRole("heading", { name: "Nueva zona operativa" })).toBeVisible();

    await page.getByLabel("Código").fill("Z-90");
    await page.getByLabel("Nombre").fill("Zona Cordón Industrial");

    await page.getByRole("button", { name: "Crear zona" }).click();

    await expect(page.getByText("Z-90")).toBeVisible();
    await expect(page.getByText("Zona Cordón Industrial")).toBeVisible();
  });

  test("Office actor edits a zone and observes that code is immutable", async ({ page }) => {
    await openZonesCatalog(page);

    // Find row for Z-02 and click Editar
    const row = page.locator("tr", { hasText: "Z-02" });
    await row.getByRole("button", { name: "Editar" }).click();

    await expect(page.getByRole("heading", { name: "Editar zona operativa" })).toBeVisible();

    // Verify code input is read-only
    const codeInput = page.getByLabel(/Código/i);
    await expect(codeInput).toHaveAttribute("readonly");
    await expect(codeInput).toHaveValue("Z-02");

    // Edit name
    const nameInput = page.getByLabel("Nombre");
    await nameInput.fill("Zona Sur Parque Industrial");

    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Zona Sur Parque Industrial")).toBeVisible();
  });

  test("Deactivating a referenced zone shows confirmation warning with references before allowing deactivation", async ({
    page,
  }) => {
    await openZonesCatalog(page);

    // Z-01 has references
    const row = page.locator("tr", { hasText: "Z-01" });
    await row.getByRole("button", { name: "Dar de baja" }).click();

    // Confirmation dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Confirmar baja de zona operativa" })).toBeVisible();
    await expect(dialog.getByText(/Advertencia: esta zona todavía cuenta con elementos activos referenciados/i)).toBeVisible();
    await expect(dialog.getByText(/El backend no realiza control de integridad referencial/i)).toBeVisible();

    // Confirm deactivation
    await dialog.getByRole("button", { name: "Dar de baja de todas formas" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(row.getByText("Inactiva")).toBeVisible();
  });

  test("Office actor assigns and removes neighborhoods from a zone", async ({ page }) => {
    await openZonesCatalog(page);

    const row = page.locator("tr", { hasText: "Z-01" });
    await row.getByRole("button", { name: "Gestionar barrios" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Gestionar barrios" })).toBeVisible();
    await dialog.getByLabel("Buscar barrios").fill("Industrial");
    await dialog.getByLabel("Barrio Industrial").check();
    await dialog.getByRole("button", { name: "Asignar seleccionados" }).click();

    await expect(dialog.getByText("Barrios asignados correctamente.")).toBeVisible();
    await expect(dialog.getByRole("list", { name: "Barrios asignados" }).getByText("Barrio Industrial")).toBeVisible();

    await dialog.getByRole("button", { name: "Quitar Barrio Industrial" }).click();
    await expect(dialog.getByText("Barrio quitado de la zona.")).toBeVisible();
  });
});
