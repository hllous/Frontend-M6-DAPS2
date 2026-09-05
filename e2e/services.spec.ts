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

  test("generic create flow schedules an unassigned ROUTE service that appears immediately in the workspace", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    // Open scheduling dialog
    await page.getByRole("button", { name: "Programar nuevo servicio" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Programar nuevo servicio" })).toBeVisible();

    // Verify derived mode indication is present
    await expect(dialog.getByText(/Recorrido \(ROUTE\)/i)).toBeVisible();

    // Enter notes
    const notesInput = dialog.getByLabel(/Notas e instrucciones operativas/i);
    await notesInput.fill("Prueba E2E servicio no asignado");

    // Submit the form
    await dialog.getByRole("button", { name: "Programar servicio" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // The newly scheduled service preview is visible and shows unassigned status
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Sin asignar")).toBeVisible();
    await expect(preview.getByText("Programado").first()).toBeVisible();
  });

  test("linked-create entry prefills origin and reference ID and schedules successfully", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await loginViaApi(page, "office-duty-queue");

    // Navigate with linked-create query params
    await page.goto("/app?destination=services&action=schedule&origin=TICKET&referenceId=TK-9921");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Programar servicio vinculado" })).toBeVisible();
    await expect(dialog.getByText("Origen vinculado preservado")).toBeVisible();
    await expect(dialog.getByText("TK-9921")).toBeVisible();

    // Select a POINT service type
    await dialog.getByLabel(/Tipo de servicio/i).selectOption({ label: "Mantenimiento de contenedores (Punto)" });
    await expect(dialog.getByText(/Punto fijo \(POINT\)/i)).toBeVisible();

    // Enter target ref
    await dialog.getByLabel(/Identificador de objetivo/i).fill("CT-0442");

    // Submit
    await dialog.getByRole("button", { name: "Programar servicio" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Service appears in workspace preview
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Sin asignar")).toBeVisible();
    await expect(preview.getByText("CT-0442")).toBeVisible();
  });

  test("attaches a crew without vehicle to an already-scheduled service that does not require one", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    // Select unassigned service SVC-1043 (Poda de árbol, POINT)
    const row = table.getByRole("row", { name: /SVC-1043/ });
    await row.click();

    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Sin asignar")).toBeVisible();

    // Click "Asignar cuadrilla" button in preview
    await preview.getByRole("button", { name: "Asignar cuadrilla" }).click();

    // Dialog opens with "Vehículo opcional" indicator
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeVisible();
    await expect(dialog.getByText("Vehículo opcional")).toBeVisible();

    // Select crew Cuadrilla C · Ibáñez
    await dialog.getByLabel(/Cuadrilla asignada/i).selectOption({ label: "Cuadrilla C · Ibáñez (Turno tarde)" });

    // Submit assignment
    await dialog.getByRole("button", { name: "Confirmar asignación" }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // Preview immediately reflects the assigned crew
    await expect(preview.getByText("Cuadrilla C · Ibáñez")).toBeVisible();

    // Table row also shows the assigned crew
    await expect(row.getByText("Cuadrilla C · Ibáñez")).toBeVisible();
  });

  test("enforces vehicle requirement and surfaces non-blocking overlap warning for service requiring vehicle", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    // Select SVC-1051 (Barrido mecánico, requires vehicle)
    const row = table.getByRole("row", { name: /SVC-1051/ });
    await row.click();

    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();

    // Click assign or reassign button
    await preview.getByRole("button", { name: /(re)?asignar cuadrilla/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Vehículo obligatorio")).toBeVisible();

    // Select crew and clear vehicle
    await dialog.getByLabel(/Cuadrilla asignada/i).selectOption({ label: "Cuadrilla A · López (Turno mañana)" });
    await dialog.getByLabel(/Vehículo operativo/i).selectOption({ value: "" });

    // Submitting without vehicle is rejected
    await dialog.getByRole("button", { name: "Confirmar asignación" }).click();
    await expect(
      dialog.getByText("El tipo de servicio requiere la asignación obligatoria de un vehículo operativo."),
    ).toBeVisible();

    // Select vehicle AF 123 CD (assigned to SVC-1042 at 09:00-13:00 on the same date)
    await dialog.getByLabel(/Vehículo operativo/i).selectOption({ value: "veh-101" });

    // Non-authoritative double-booking warning appears
    await expect(dialog.getByRole("status")).toBeVisible();
    await expect(dialog.getByText(/Aviso de superposición horaria \(no bloqueante\)/i)).toBeVisible();
    await expect(dialog.getByText(/Aviso no bloqueante/i)).toBeVisible();

    // Confirm button remains enabled and can be clicked without override rationale input
    await expect(dialog.getByRole("button", { name: "Confirmar asignación" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Confirmar asignación" }).click();

    // Dialog closes upon successful assignment
    await expect(dialog).not.toBeVisible();

    // Workspace preview immediately reflects the assigned crew and vehicle
    await expect(preview.getByText("Cuadrilla A · López")).toBeVisible();
    await expect(preview.getByText("AF 123 CD")).toBeVisible();

    // Table row also shows the assigned crew
    await expect(row.getByText("Cuadrilla A · López")).toBeVisible();
  });
});
