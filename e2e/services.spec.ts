import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const NARROW_VIEWPORT = { width: 390, height: 844 };
const WIDE_VIEWPORT = { width: 1280, height: 900 };

async function openServices(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=services");
  await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
}

test.describe("Servicios workspace responsive & interactive journeys @smoke", () => {
  test("wide viewport shows split pane with table, map, and synchronized selection", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    // Verify presence of table region and map region
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const map = page.getByRole("region", { name: /mapa territorial de servicios/i });
    await expect(table).toBeVisible();
    await expect(map).toBeVisible();

    // Verify rows exist
    const rows = table.getByRole("row");
    await expect(rows.first()).toBeVisible();

    // Select the service row for SVC-1043
    const firstServiceRow = table.getByRole("row", { name: /SVC-1043/ });
    await firstServiceRow.click();

    // Preview panel opens with title and details
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("SVC-1043")).toBeVisible();
    await expect(preview.getByRole("button", { name: "Ver detalle completo" })).toBeVisible();

    // Corresponding map marker has aria-pressed="true"
    const marker1 = map.locator("button[aria-pressed='true']");
    await expect(marker1).toBeVisible();
    await expect(marker1).toHaveAttribute("aria-label", /SVC-1043/);

    // Close preview to test map interaction directly
    await preview.getByRole("button", { name: "Cerrar vista previa" }).click();
    await expect(preview).not.toBeVisible();

    // Select a different marker directly on the map (SVC-1051)
    const marker2 = map.locator("button[aria-label*='SVC-1051']");
    await marker2.click();

    // Preview now re-opens showing SVC-1051
    await expect(preview).toBeVisible();
    await expect(preview.getByText("SVC-1051")).toBeVisible();
    // Corresponding table row is selected
    const secondServiceRow = table.getByRole("row", { name: /SVC-1051/ });
    await expect(secondServiceRow).toHaveAttribute("aria-selected", "true");
  });

  test("search input filters services and updates the URL parameter", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const searchInput = page.getByRole("searchbox", { name: "Buscar servicios por texto libre" });
    await searchInput.fill("Poda");

    // Table filters to matching services
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(table.getByText("SVC-1043")).toBeVisible();
    await expect(table.getByText("SVC-1051")).not.toBeVisible();

    // URL is updated with q param
    await expect(page).toHaveURL(/q=Poda/);

    // Clear filters button resets search
    await page.getByRole("button", { name: /limpiar/i }).click();
    await expect(table.getByText("SVC-1051")).toBeVisible();
    await expect(searchInput).toHaveValue("");
  });

  test("explicit action opens full detail view and allows returning to workspace", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1043/ });
    await row.click();

    // Click explicit action "Ver detalle completo"
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    // Full detail view is active
    await expect(page.getByRole("region", { name: /Detalle completo de SVC-1043/i })).toBeVisible();
    await expect(page.getByText("Detalle operativo")).toBeVisible();

    // Return back to services workspace
    await page.getByRole("button", { name: "Volver a Servicios" }).click();
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
    await expect(table).toBeVisible();
  });

  test("narrow viewport provides view switcher between list and map", async ({ page }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await openServices(page);

    // List and map view switcher buttons within main content area
    const content = page.locator("#contenido-principal");
    const listToggle = content.getByRole("button", { name: /Lista/ });
    const mapToggle = content.getByRole("button", { name: "Mapa" });
    await expect(listToggle).toBeVisible();
    await expect(mapToggle).toBeVisible();

    // Initially, list/table is visible and map is not visible
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(table).toBeVisible();
    await expect(page.getByRole("region", { name: /mapa territorial de servicios/i })).not.toBeVisible();

    // Switch to Map view
    await mapToggle.click();
    const map = page.getByRole("region", { name: /mapa territorial de servicios/i });
    await expect(map).toBeVisible();
    await expect(table).not.toBeVisible();

    // Activating a marker in map view opens the preview (operable via keyboard Enter)
    const marker = map.locator("button[aria-label*='SVC-1043']");
    await marker.focus();
    await page.keyboard.press("Enter");
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("SVC-1043")).toBeVisible();
  });
});
