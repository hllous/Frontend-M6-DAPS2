import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogOption } from "./support/catalog-611-controls";

async function openRoutesCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/routes");
}

test.describe("Route catalog management #107", () => {
  test("Office actor lists routes and filters by active status, search, and zone", async ({ page }) => {
    await openRoutesCatalog(page);

    await expect(page.getByRole("heading", { name: "Recorridos", level: 1 })).toBeVisible();
    await expect(page.getByText("REC-001")).toBeVisible();
    await expect(page.getByText("Recorrido Casco Histórico")).toBeVisible();
    await expect(page.getByText("REC-002")).toBeVisible();

    await chooseCatalogOption(page, "Estado:", "Solo activos");
    await expect(page.getByText("REC-003")).not.toBeVisible();
    await chooseCatalogOption(page, "Estado:", "Todos");
    await expect(page.getByText("REC-003")).toBeVisible();

    // Filter by search
    const searchInput = page.getByRole("textbox", { name: "Buscar recorridos" });
    await searchInput.fill("Costanera");
    await expect(page.getByText("REC-002")).toBeVisible();
    await expect(page.getByText("Recorrido Casco Histórico")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("Recorrido Casco Histórico")).toBeVisible();

    // Filter by zone
    await chooseCatalogOption(page, "Zona:", "Belgrano (Z-BEL)");
    await expect(page.getByText("REC-001")).toBeVisible();
    await expect(page.getByText("REC-002")).not.toBeVisible();
  });

  test("Office actor creates a new route and lands on detail view with empty stops and obvious CTA", async ({ page }) => {
    await openRoutesCatalog(page);

    await page.getByRole("button", { name: "Nuevo recorrido" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo recorrido" })).toBeVisible();

    await page.getByRole("textbox", { name: "Código del recorrido" }).fill("REC-050");
    await page.getByRole("textbox", { name: "Nombre descriptivo" }).fill("Recorrido Circunvalación");

    await page.getByRole("button", { name: "Crear recorrido" }).click();

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
    const nameInput = page.getByRole("textbox", { name: "Nombre descriptivo" });
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
    const dialog = page.getByRole("dialog", { name: "Confirmar baja del recorrido REC-001" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Confirmar baja del recorrido REC-001" })).toBeVisible();
    await expect(dialog.getByTestId("references-warning-dialog")).toBeVisible();
    await expect(dialog.getByText(/Advertencia: El recorrido está asignado a frecuencias de servicio activas/i)).toBeVisible();
    await expect(dialog.getByText(/Recolección Domiciliaria/i)).toBeVisible();

    // Confirm deactivation
    await dialog.getByRole("button", { name: "Dar de baja el recorrido REC-001" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(row.getByText("Inactivo")).toBeVisible();

    await page.evaluate(async () => {
      const res = await fetch("/api/routes/route-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) {
        throw new Error(`Failed to reactivate route: ${res.status}`);
      }
    });
  });
});
