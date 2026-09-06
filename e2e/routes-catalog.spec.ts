import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function openRoutesCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/routes");
}

test.describe("Route catalog management #107", () => {
  test("Office actor lists routes and filters by active status, search, and zone", async ({ page }) => {
    await openRoutesCatalog(page);

    await expect(page.getByRole("heading", { name: "Catálogo de Recorridos" })).toBeVisible();
    await expect(page.getByText("REC-001")).toBeVisible();
    await expect(page.getByText("Recorrido Casco Histórico")).toBeVisible();
    await expect(page.getByText("REC-002")).toBeVisible();

    // Filter by search
    const searchInput = page.getByTestId("search-routes-input");
    await searchInput.fill("Costanera");
    await expect(page.getByText("REC-002")).toBeVisible();
    await expect(page.getByText("Recorrido Casco Histórico")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("Recorrido Casco Histórico")).toBeVisible();

    // Filter by zone
    const zoneSelect = page.getByTestId("zone-filter-select");
    await zoneSelect.selectOption("zone-1");
    await expect(page.getByText("REC-001")).toBeVisible();
    await expect(page.getByText("REC-002")).not.toBeVisible();
  });

  test("Office actor creates a new route and lands on detail view with empty stops and obvious CTA", async ({ page }) => {
    await openRoutesCatalog(page);

    await page.getByTestId("create-route-button").click();
    await expect(page.getByRole("heading", { name: "Nuevo recorrido" })).toBeVisible();

    await page.getByTestId("create-route-code-input").fill("REC-050");
    await page.getByTestId("create-route-name-input").fill("Recorrido Circunvalación");

    await page.getByTestId("submit-create-route").click();

    // Verify it lands on its detail view
    const detailView = page.getByTestId("route-detail-view");
    await expect(detailView).toBeVisible();
    await expect(detailView.getByText("REC-050")).toBeVisible();
    await expect(detailView.getByText("Recorrido Circunvalación")).toBeVisible();

    // Verify empty stops section and CTA
    const emptyStops = detailView.getByTestId("empty-stops-section");
    await expect(emptyStops).toBeVisible();
    await expect(emptyStops.getByText("Este recorrido no tiene paradas configuradas")).toBeVisible();
    await expect(detailView.getByTestId("add-stops-cta")).toBeVisible();
    await expect(detailView.getByTestId("add-stops-cta")).toContainText("Agregar paradas");
  });

  test("Office actor edits a route and observes that code is immutable", async ({ page }) => {
    await openRoutesCatalog(page);

    // Find row for REC-002 and click Editar
    const row = page.getByTestId("route-row-route-2");
    await row.getByTestId("edit-route-route-2").click();

    await expect(page.getByRole("heading", { name: "Editar recorrido" })).toBeVisible();

    // Verify code input is read-only and disabled
    const codeInput = page.getByTestId("edit-route-code-readonly");
    await expect(codeInput).toHaveAttribute("readonly");
    await expect(codeInput).toBeDisabled();
    await expect(codeInput).toHaveValue("REC-002");

    // Edit name
    const nameInput = page.getByTestId("edit-route-name-input");
    await nameInput.fill("Recorrido Costanera Modificado");

    await page.getByTestId("submit-edit-route").click();

    await expect(page.getByText("Recorrido Costanera Modificado")).toBeVisible();
  });

  test("Deactivating a route referenced by active ServiceFrequency warns first before allowing deactivation", async ({
    page,
  }) => {
    await openRoutesCatalog(page);

    // REC-001 has active ServiceFrequency in fixtures
    const row = page.getByTestId("route-row-route-1");
    await row.getByTestId("deactivate-route-route-1").click();

    // Confirmation warning dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Desactivar recorrido" })).toBeVisible();
    await expect(dialog.getByTestId("references-warning-dialog")).toBeVisible();
    await expect(dialog.getByText(/Advertencia: El recorrido está asignado a frecuencias de servicio activas/i)).toBeVisible();
    await expect(dialog.getByText(/Recolección Domiciliaria/i)).toBeVisible();

    // Confirm deactivation
    await dialog.getByTestId("confirm-deactivate-button").click();

    await expect(dialog).not.toBeVisible();
    await expect(row.getByText("Inactivo")).toBeVisible();
  });
});
