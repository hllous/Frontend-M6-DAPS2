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

test.describe("Field assigned service viewing, start action, and cross-view status @smoke", () => {
  test("Field My Work scopes strictly to actor crew and Crew Member sees read-only detail", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");

    // Header and context
    await expect(page.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    await expect(page.getByText("Integrante de cuadrilla")).toBeVisible();

    // Services assigned to Cuadrilla B are visible
    await expect(page.getByText("Barrido mecánico — Bulevar Costero")).toBeVisible();
    await expect(page.getByText("Reparación de contenedor CT-0112")).toBeVisible();

    // Other crews' services are out of scope (e.g. Recolección de residuos assigned to Cuadrilla A)
    await expect(page.getByText("Recolección de residuos — Recorrido 4")).toHaveCount(0);

    // Crew Member sees no state-changing start buttons
    await expect(page.getByRole("button", { name: "Iniciar servicio" })).toHaveCount(0);
    await expect(page.getByText("Solo consulta").first()).toBeVisible();
    await expect(
      page.getByText("La persona responsable de la cuadrilla registra los cambios de estado del servicio."),
    ).toBeVisible();

    // Crew Member can open detail view for assigned service
    const firstDetailButton = page.getByRole("button", { name: "Ver detalle" }).first();
    await firstDetailButton.click();

    // Detail view is open and read-only
    await expect(page.getByRole("region", { name: /Detalle completo de SVC-1050/i })).toBeVisible();
    await expect(page.getByText("Solo consulta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar servicio" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /asignar cuadrilla/i })).toHaveCount(0);

    // Can return back to assigned services list
    await page.getByRole("button", { name: "Volver a Servicios asignados" }).click();
    await expect(page.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
  });

  test("Crew Leader starts assigned service with advisory window warning, rejects invalid start, and reflects IN_PROGRESS in Office workspace", async ({ page }) => {
    // 1. Crew Leader logs in to Field view
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    await expect(page.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    await expect(page.getByText("Responsable de cuadrilla")).toBeVisible();

    // Scoped list displays scheduled services
    await expect(page.getByText("Barrido mecánico — Bulevar Costero")).toBeVisible();
    await expect(page.getByText("Reparación de contenedor CT-0112")).toBeVisible();

    // Out of window warning is rendered (08:00 - 12:00 window)
    await expect(page.getByText(/Inicio fuera de ventana horaria/i).first()).toBeVisible();

    // 2. Reject starting service missing a required vehicle (SVC-1054)
    const card1054 = page.locator("li").filter({ hasText: "SVC-1054" });
    await card1054.getByRole("button", { name: "Iniciar servicio" }).click();

    // Backend 409 error is surfaced in UI alert
    const alert = card1054.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/El tipo de servicio requiere un vehículo operativo asignado para iniciar/i);

    // 3. Crew Leader successfully starts scheduled service with vehicle (SVC-1050)
    const card1050 = page.locator("li").filter({ hasText: "SVC-1050" });
    await card1050.getByRole("button", { name: "Iniciar servicio" }).click();

    // Status transitions to IN_PROGRESS ("En curso") in My Work list
    await expect(card1050.getByText("En curso")).toBeVisible();

    // 4. Open detail view and verify IN_PROGRESS reflection
    await card1050.getByRole("button", { name: "Ver detalle" }).click();

    await expect(page.getByRole("region", { name: /Detalle completo de SVC-1050/i })).toBeVisible();
    // In detail view, StatusBadge shows "En curso"
    await expect(page.getByRole("region", { name: /Detalle completo de SVC-1050/i }).getByText("En curso")).toBeVisible();
    // In progress service cannot be started again
    await expect(page.getByRole("button", { name: "Iniciar servicio" })).toHaveCount(0);

    // 5. Verify cross-view reflection in Office workspace
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");

    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });

    // Select row for SVC-1050 in table
    const serviceRow = table.getByRole("row", { name: /SVC-1050/ });
    await expect(serviceRow).toBeVisible();
    // Table row reflects "En curso"
    await expect(serviceRow.getByText("En curso")).toBeVisible();

    // Click row to open preview
    await serviceRow.click();
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("SVC-1050")).toBeVisible();
    // Preview reflects "En curso"
    await expect(preview.getByText("En curso").first()).toBeVisible();
  });

  test("Crew Leader records zone results out-of-order, uploads evidence with canonical reflection, completes service with backend rollup, and verifies mobile disclosure", async ({ page }) => {
    // 1. Crew Leader logs in to Field view and starts SVC-1055
    await page.setViewportSize(WIDE_VIEWPORT);
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const card1055 = page.locator("li").filter({ hasText: "SVC-1055" });
    await expect(card1055).toBeVisible();
    await card1055.getByRole("button", { name: "Iniciar servicio" }).click();
    await expect(card1055.getByText("En curso")).toBeVisible();

    // 2. Open detail view
    await card1055.getByRole("button", { name: "Ver detalle" }).click();
    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1055/i });
    await expect(detailRegion).toBeVisible();

    // Zone execution panel is rendered
    const zonePanel = page.getByRole("region", { name: "Registro de ejecución de zonas" });
    await expect(zonePanel).toBeVisible();

    // Completion button is initially disabled because 0/2 zones are recorded
    const completeButton = zonePanel.getByRole("button", { name: "Completar servicio" });
    await expect(completeButton).toBeDisabled();
    await expect(zonePanel.getByText("Pendiente: 2 de 2 zona(s)")).toBeVisible();

    // 3. Desktop multi-zone navigation: record ROUTE zones in ANY order (record Zona Norte first!)
    const navAside = zonePanel.locator("aside[aria-label='Navegación de zonas del servicio']");
    await expect(navAside).toBeVisible();

    // Click Zona Norte in sidebar
    await navAside.getByRole("button", { name: /Zona Norte/i }).click();

    // Fill notes and record clean SERVICED result
    const notesInput = zonePanel.locator("#zone-notes");
    await notesInput.fill("Barrido completado en calzada norte sin novedades.");

    // Submit zone result
    await zonePanel.getByRole("button", { name: "Guardar resultado de zona" }).click();

    // Zona Norte is recorded as Atendida
    await expect(navAside.locator("li").filter({ hasText: "Zona Norte" }).getByText("Atendida")).toBeVisible();
    // Completion button is still disabled (1/2 zones recorded)
    await expect(completeButton).toBeDisabled();
    await expect(zonePanel.getByText("Pendiente: 1 de 2 zona(s)")).toBeVisible();

    // 4. Record Zona Centro as PARTIAL with required exception reason and evidence upload
    await navAside.getByRole("button", { name: /Zona Centro/i }).click();

    // Select Parcial via label
    await zonePanel.locator("label", { hasText: "Parcial" }).click();

    // Select required exception reason
    const reasonSelect = zonePanel.locator("#zone-reason-select");
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption("BLOCKED_ACCESS");

    // Add operational notes
    await notesInput.fill("Corte total por obras de repavimentación en Bulevar.");

    // Upload evidence file with raw un-sanitized local filename
    const fileInput = page.locator("#evidence-input");
    await fileInput.setInputFiles({
      name: "Foto Corte Repavimentacion (Obra).jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-evidence-image-data"),
    });

    // Local filename is visible before submission
    await expect(zonePanel.getByText("Foto Corte Repavimentacion (Obra).jpg")).toBeVisible();

    // Submit zone result
    await zonePanel.getByRole("button", { name: "Guardar resultado de zona" }).click();

    // Evidence file switches to Backend's sanitized canonical filename
    await expect(zonePanel.getByText("foto_corte_repavimentacion_obra.jpg")).toBeVisible();

    // Both zones are now recorded
    await expect(zonePanel.getByText("Todas las zonas registradas. Listo para finalizar.")).toBeVisible();
    await expect(completeButton).toBeEnabled();

    // 5. Invoke completion action (sent with no body) and verify Backend-computed PARTIALLY_COMPLETED
    await completeButton.click();

    // Backend-computed status is rendered as-is (Parcial)
    await expect(zonePanel.getByText(/Servicio finalizado con estado: Parcial \(PARTIALLY_COMPLETED\)/i)).toBeVisible();
    // Header badge updates to Parcial
    await expect(detailRegion.getByText("Parcial").first()).toBeVisible();

    // 6. Test mobile disclosure and focus restoration on narrow viewport
    await page.setViewportSize(NARROW_VIEWPORT);
    const mobileToggle = page.locator("button[aria-controls='mobile-zone-nav']");
    await expect(mobileToggle).toBeVisible();
    await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");

    // Click to open mobile navigation
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute("aria-expanded", "true");
    const mobileNavList = page.locator("#mobile-zone-nav");
    await expect(mobileNavList).toBeVisible();

    // Click again to close and verify focus returns to mobileToggle
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNavList).not.toBeVisible();
    await expect(mobileToggle).toBeFocused();

    // 7. Verify cross-view reflection in Office workspace
    await page.setViewportSize(WIDE_VIEWPORT);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const serviceRow = table.getByRole("row", { name: /SVC-1055/ });
    await expect(serviceRow).toBeVisible();
    // Table row reflects Backend-computed "Parcial"
    await expect(serviceRow.getByText("Parcial")).toBeVisible();

    // Click row to open preview
    await serviceRow.click();
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("SVC-1055")).toBeVisible();
    await expect(preview.getByText("Parcial").first()).toBeVisible();
  });

  test("Crew Leader suspends an in-progress service with reason, note and evidence, then resumes it clearing the reason, reflected in Office", async ({ page }) => {
    // 1. Crew Leader starts SVC-1080
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const card1080 = page.locator("li").filter({ hasText: "SVC-1080" });
    await expect(card1080).toBeVisible();
    await card1080.getByRole("button", { name: "Iniciar servicio" }).click();
    await expect(card1080.getByText("En curso")).toBeVisible();

    // 2. Open detail view and suspend it
    await card1080.getByRole("button", { name: "Ver detalle" }).click();
    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1080/i });
    await expect(detailRegion).toBeVisible();

    await detailRegion.getByRole("button", { name: "Suspender servicio" }).click();

    const suspendDialog = page.getByRole("dialog");
    await expect(suspendDialog).toBeVisible();
    await expect(suspendDialog.getByRole("heading", { name: /Suspender SVC-1080/i })).toBeVisible();

    // Required reason + note
    await suspendDialog.getByLabel(/Motivo de suspensión/i).selectOption("VEHICLE_BREAKDOWN");
    await suspendDialog.getByLabel(/^Nota/i).fill("El camión no arranca, se solicitó grúa.");

    // Applicable evidence attached
    const fileInput = suspendDialog.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "Foto Desperfecto Vehicular.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-breakdown-evidence"),
    });
    await expect(suspendDialog.getByText("Foto Desperfecto Vehicular.jpg")).toBeVisible();

    await suspendDialog.getByRole("button", { name: "Suspender servicio" }).click();
    await expect(suspendDialog).not.toBeVisible();

    // Service reflects SUSPENDED with the recorded reason and note
    await expect(detailRegion.getByText("Suspendido").first()).toBeVisible();
    await expect(detailRegion.getByText(/desperfecto vehicular/i)).toBeVisible();
    await expect(detailRegion.getByText(/el camión no arranca, se solicitó grúa/i)).toBeVisible();

    // 3. Crew Leader resumes it — clears the prior reason, no Office intervention needed
    await detailRegion.getByRole("button", { name: "Reanudar servicio" }).click();
    await expect(detailRegion.getByText("En curso").first()).toBeVisible();
    await expect(detailRegion.getByText(/desperfecto vehicular/i)).toHaveCount(0);

    // 4. Cross-view reflection in Office workspace
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const serviceRow = table.getByRole("row", { name: /SVC-1080/ });
    await expect(serviceRow).toBeVisible();
    await expect(serviceRow.getByText("En curso")).toBeVisible();
  });

  test("Crew Member cannot suspend or resume a service assigned to their crew", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");

    // Whatever status SVC-1080 is in, a Crew Member never gets state-changing controls in its detail view.
    const card1080 = page.locator("li").filter({ hasText: "SVC-1080" });
    await card1080.getByRole("button", { name: "Ver detalle" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1080/i });
    await expect(detailRegion).toBeVisible();
    await expect(detailRegion.getByRole("button", { name: "Suspender servicio" })).toHaveCount(0);
    await expect(detailRegion.getByRole("button", { name: "Reanudar servicio" })).toHaveCount(0);
  });
});

test.describe("Office two-step Service reschedule flow @smoke", () => {
  test("Office moves a scheduled service to RESCHEDULED with a reason, then confirms a new date/window, preserving zones verbatim", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1062/ });
    await row.click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1062/i });
    await expect(detailRegion).toBeVisible();
    await expect(detailRegion.getByText("Zona Sur").first()).toBeVisible();

    // Step 1: reason moves SCHEDULED -> RESCHEDULED
    await detailRegion.getByRole("button", { name: "Reprogramar" }).click();
    const reasonDialog = page.getByRole("dialog");
    await expect(reasonDialog).toBeVisible();
    await expect(reasonDialog.getByText(/Paso 1 de 2/i)).toBeVisible();
    await reasonDialog.getByLabel(/^Motivo/i).fill("Alerta meteorológica: vientos fuertes previstos.");
    await reasonDialog.getByRole("button", { name: "Mover a reprogramar" }).click();
    await expect(reasonDialog).not.toBeVisible();

    // Intermediate RESCHEDULED state is visible in the workspace, not collapsed into one interaction
    await expect(detailRegion.getByText("A reprogramar").first()).toBeVisible();
    await expect(detailRegion.getByText(/vientos fuertes previstos/i)).toBeVisible();
    await expect(detailRegion.getByRole("button", { name: "Reprogramar" })).toHaveCount(0);

    // Step 2: a separate call supplies the new date/window
    await detailRegion.getByRole("button", { name: "Confirmar nueva fecha" }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText(/Paso 2 de 2/i)).toBeVisible();
    // zoneIds snapshot is shown untouched ahead of confirming
    await expect(confirmDialog.getByText("Zona Sur")).toBeVisible();

    await confirmDialog.locator("input[type='date']").fill("2026-09-13");
    await confirmDialog.getByRole("button", { name: "Confirmar nueva fecha" }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Back to SCHEDULED with the new date, zones preserved verbatim
    await expect(detailRegion.getByText("Programado").first()).toBeVisible();
    await expect(detailRegion.getByText("2026-09-13")).toBeVisible();
    await expect(detailRegion.getByText("Zona Sur").first()).toBeVisible();
  });

  test("Field actors cannot reschedule a Service", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const card1050 = page.locator("li").filter({ hasText: "SVC-1050" });
    await card1050.getByRole("button", { name: "Ver detalle" }).click();

    await expect(page.getByRole("button", { name: "Reprogramar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirmar nueva fecha" })).toHaveCount(0);
  });
});

test.describe("Office cancels a Service @smoke", () => {
  test("Office cancels a SCHEDULED service with a required reason", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1090/ });
    await row.click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1090/i });
    await expect(detailRegion).toBeVisible();

    await detailRegion.getByRole("button", { name: "Cancelar servicio" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Cancelar SVC-1090" })).toBeVisible();

    // Empty reason is rejected client-side
    await dialog.getByRole("button", { name: "Cancelar servicio" }).click();
    await expect(dialog.getByText(/motivo de la cancelación/i)).toBeVisible();

    await dialog.getByLabel(/^Motivo/i).fill("El vecino desistió del reclamo.");
    await dialog.getByRole("button", { name: "Cancelar servicio" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(detailRegion.getByText("Cancelado").first()).toBeVisible();
    await expect(detailRegion.getByText(/el vecino desistió del reclamo/i)).toBeVisible();
  });

  test("Office cancels a RESCHEDULED service directly, without a replacement date", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1091/ });
    await row.click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1091/i });
    await expect(detailRegion).toBeVisible();
    await expect(detailRegion.getByText("A reprogramar").first()).toBeVisible();

    await detailRegion.getByRole("button", { name: "Cancelar servicio" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // No date/window input is ever offered for a RESCHEDULED cancellation
    await expect(dialog.locator("input[type='date']")).toHaveCount(0);

    await dialog.getByLabel(/^Motivo/i).fill("Ya no se requiere el servicio.");
    await dialog.getByRole("button", { name: "Cancelar servicio" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(detailRegion.getByText("Cancelado").first()).toBeVisible();
    // scheduledDate snapshot is left untouched by cancellation
    await expect(detailRegion.getByText("2026-09-06")).toBeVisible();
  });

  test("Office cancels a SUSPENDED service", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1092/ });
    await row.click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1092/i });
    await expect(detailRegion).toBeVisible();
    await expect(detailRegion.getByText("Suspendido").first()).toBeVisible();

    await detailRegion.getByRole("button", { name: "Cancelar servicio" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Motivo/i).fill("Contenedor reemplazado por otra vía.");
    await dialog.getByRole("button", { name: "Cancelar servicio" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(detailRegion.getByText("Cancelado").first()).toBeVisible();
  });

  test("Direct cancellation is unavailable while a Service is IN_PROGRESS", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await openServices(page);

    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = table.getByRole("row", { name: /SVC-1093/ });
    await row.click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1093/i });
    await expect(detailRegion).toBeVisible();
    await expect(detailRegion.getByText("En curso").first()).toBeVisible();

    // No cancel action while IN_PROGRESS — suspension is the required preceding step
    await expect(detailRegion.getByRole("button", { name: "Cancelar servicio" })).toHaveCount(0);
  });
});

test.describe("Field local drafts and Conflict resolution for offline actions @smoke", () => {
  test("a suspend draft survives a reload and an out-of-band server change surfaces an explicit conflict, never applied silently", async ({
    page,
    browser,
  }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const card = page.locator("li").filter({ hasText: "SVC-1094" });
    await card.getByRole("button", { name: "Ver detalle" }).click();
    const detailRegion = page.getByRole("region", { name: /Detalle completo de SVC-1094/i });
    await expect(detailRegion).toBeVisible();

    await detailRegion.getByRole("button", { name: "Suspender servicio" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Motivo de suspensión/i).selectOption("VEHICLE_BREAKDOWN");
    await dialog.getByLabel(/^Nota/i).fill("El camión no arranca, se solicitó grúa.");

    // Simulate connectivity loss on the suspend submission
    await page.route("**/api/services/*/suspend", (route) => route.abort("failed"));
    await dialog.getByRole("button", { name: "Suspender servicio" }).click();

    await expect(dialog.getByRole("status")).toContainText(/borrador local pendiente/i);
    await expect(dialog.getByRole("button", { name: "Reintentar envío" })).toBeVisible();

    // Close and reload: the draft is kept on-device (localStorage), not in memory only
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await page.unroute("**/api/services/*/suspend");
    await page.reload();

    const cardAfterReload = page.locator("li").filter({ hasText: "SVC-1094" });
    await cardAfterReload.getByRole("button", { name: "Ver detalle" }).click();
    await detailRegion.getByRole("button", { name: "Suspender servicio" }).click();
    const reopenedDialog = page.getByRole("dialog");
    await expect(reopenedDialog).toBeVisible();
    await expect(reopenedDialog.getByLabel(/Motivo de suspensión/i)).toHaveValue("VEHICLE_BREAKDOWN");
    await expect(reopenedDialog.getByLabel(/^Nota/i)).toHaveValue(
      "El camión no arranca, se solicitó grúa.",
    );
    await expect(reopenedDialog.getByRole("status")).toContainText(/borrador local pendiente/i);

    // Out-of-band server-side change while the draft was pending: a second device (its own
    // browser context — separate localStorage from the first tab's pending draft) successfully
    // suspends the Service online in the meantime.
    const secondDeviceContext = await browser.newContext();
    const secondTab = await secondDeviceContext.newPage();
    await loginViaApi(secondTab, "field-crew-leader-route");
    await secondTab.goto("/app");
    const secondCard = secondTab.locator("li").filter({ hasText: "SVC-1094" });
    await secondCard.getByRole("button", { name: "Ver detalle" }).click();
    const secondDetailRegion = secondTab.getByRole("region", { name: /Detalle completo de SVC-1094/i });
    await secondDetailRegion.getByRole("button", { name: "Suspender servicio" }).click();
    const secondDialog = secondTab.getByRole("dialog");
    await secondDialog.getByLabel(/Motivo de suspensión/i).selectOption("CREW_UNAVAILABLE");
    await secondDialog.getByLabel(/^Nota/i).fill("Cuadrilla reasignada a otro servicio urgente.");
    await secondDialog.getByRole("button", { name: "Suspender servicio" }).click();
    await expect(secondDialog).not.toBeVisible();
    await expect(secondDetailRegion.getByText("Suspendido").first()).toBeVisible();
    await secondDeviceContext.close();

    // Manual resubmission fetches current state first — a mismatch is an explicit conflict,
    // comparing the stale "En curso" the draft was composed against with the current "Suspendido"
    await reopenedDialog.getByRole("button", { name: "Reintentar envío" }).click();
    await expect(reopenedDialog.getByText(/cambió mientras/i)).toBeVisible();
    const comparisonTable = reopenedDialog.getByRole("table", { name: /comparación de versiones/i });
    await expect(comparisonTable.getByText("En curso")).toBeVisible();
    await expect(comparisonTable.getByText("Suspendido")).toBeVisible();

    // Preserving keeps the draft pending on-device for a later retry — the dialog returns
    // to the form view (still showing the pending-draft banner), never applying the draft
    await reopenedDialog.getByRole("button", { name: "Conservar borrador" }).click();
    await expect(reopenedDialog.getByRole("status")).toContainText(/borrador local pendiente/i);
    await expect(reopenedDialog.getByLabel(/^Nota/i)).toHaveValue(
      "El camión no arranca, se solicitó grúa.",
    );
  });

  test("a draft that matches current server state resubmits normally and clears once accepted", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const card = page.locator("li").filter({ hasText: "SVC-1095" });
    await expect(card).toBeVisible();

    await page.route("**/api/services/*/start", (route) => route.abort("failed"));
    await card.getByRole("button", { name: "Iniciar servicio" }).click();

    await expect(card.getByText(/Borrador local pendiente de envío/i)).toBeVisible();
    const retryButton = card.getByRole("button", { name: "Reintentar envío" });
    await expect(retryButton).toBeVisible();

    // Reconnects: the Service did not change server-side, so the draft resubmits normally
    await page.unroute("**/api/services/*/start");
    await retryButton.click();

    await expect(card.getByText("En curso")).toBeVisible();
    await expect(card.getByText(/Borrador local pendiente de envío/i)).toHaveCount(0);
  });
});
