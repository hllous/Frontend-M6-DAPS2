import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function openContainersCatalog(page: import("@playwright/test").Page, scenarioId: "office-duty-queue" | "field-crew-leader-route" = "office-duty-queue") {
  await loginViaApi(page, scenarioId);
  await page.goto("/app/catalog/containers");
}

test.describe("Container catalog management #120", () => {
  test("Office actor lists containers and filters by search, type, and status", async ({ page }) => {
    await openContainersCatalog(page, "office-duty-queue");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-001")).toBeVisible();
    await expect(page.getByText("CONT-002")).toBeVisible();

    // Filter by search
    const searchInput = page.getByLabel("Buscar contenedor");
    await searchInput.fill("Santa Fe");
    await expect(page.getByText("CONT-002")).toBeVisible();
    await expect(page.getByText("CONT-001")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("CONT-001")).toBeVisible();

    // Filter by status
    const statusFilter = page.locator("#container-status-filter");
    await statusFilter.selectOption("OVERFLOWED");
    await expect(page.getByText("CONT-002")).toBeVisible();
    await expect(page.getByText("CONT-001")).not.toBeVisible();
  });

  test("Office actor creates a new container and observes it in the catalog", async ({ page }) => {
    await openContainersCatalog(page, "office-duty-queue");

    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Registrar contenedor" })).toBeVisible();

    await dialog.locator("#container-code").fill("CONT-E2E-99");
    await dialog.locator("#container-type-form").selectOption("RECYCLABLE");
    await dialog.locator("#container-zone-form").selectOption({ index: 0 });
    await dialog.locator("#container-capacity").fill("1500");
    await dialog.locator("#container-address").fill("Av. Belgrano 1200");
    await dialog.locator("#container-lat").fill("-34.6120");
    await dialog.locator("#container-lng").fill("-58.3810");

    await dialog.getByRole("button", { name: "Guardar contenedor" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Contenedor registrado con éxito.")).toBeVisible();

    // The catalog's default page only shows the first page of results, and other
    // e2e specs permanently add containers of their own — search to make sure the
    // new row is found regardless of how many containers now precede it.
    await page.getByLabel("Buscar contenedor").fill("CONT-E2E-99");
    await expect(page.getByText("CONT-E2E-99")).toBeVisible();
    await expect(page.getByText("Av. Belgrano 1200")).toBeVisible();
  });

  test("Office actor edits a container and verifies code and containerType are immutable", async ({ page }) => {
    await openContainersCatalog(page, "office-duty-queue");

    const row = page.locator("tr", { hasText: "CONT-001" });
    await row.getByRole("button", { name: "Editar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Editar contenedor" })).toBeVisible();

    // Code and type must be disabled
    await expect(dialog.locator("#container-code")).toBeDisabled();
    await expect(dialog.locator("#container-type-form")).toBeDisabled();

    // Edit address
    const addressInput = dialog.locator("#container-address");
    await addressInput.fill("Av. Rivadavia 2050");

    await dialog.getByRole("button", { name: "Guardar contenedor" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Contenedor actualizado con éxito.")).toBeVisible();
    await expect(page.getByText("Av. Rivadavia 2050")).toBeVisible();
  });

  test("Field actor has read-only access and can inspect damage details", async ({ page }) => {
    await openContainersCatalog(page, "field-crew-leader-route");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-003")).toBeVisible();

    // Management buttons should not be present
    await expect(page.getByRole("button", { name: "Registrar contenedor" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).not.toBeVisible();

    // Inspect detail
    const row = page.locator("tr", { hasText: "CONT-003" });
    await row.getByRole("button", { name: "Ver detalle" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Detalle del contenedor CONT-003" })).toBeVisible();
    await expect(dialog.getByText("Diagnóstico de daño")).toBeVisible();
    await expect(dialog.getByText("Tapa rota")).toBeVisible();

    await dialog.getByRole("button", { name: "Cerrar detalle" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("Catalog landing page links to Containers catalog", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog");

    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    const containerCard = page.locator("li", { hasText: "Contenedores" });
    await expect(containerCard).toBeVisible();
    await expect(containerCard.getByText("Inventario de contenedores en vía pública")).toBeVisible();

    await containerCard.getByRole("link", { name: "Abrir catálogo" }).click();
    await expect(page).toHaveURL(/\/app\/catalog\/containers/);
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
  });
});
