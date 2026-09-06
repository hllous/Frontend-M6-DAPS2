import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function openRoutesCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/routes");
}

test.describe("Route stop-sequence builder #111", () => {
  test.describe.configure({ mode: "serial" });

  test("Office actor edits stop sequence on dedicated route fixture: add, reject duplicate, reorder, and save atomically", async ({
    page,
  }) => {
    await openRoutesCatalog(page);

    await expect(page.getByRole("heading", { name: "Catálogo de Recorridos" })).toBeVisible();

    // Locate dedicated fixture REC-004 (Recorrido Parque Industrial)
    const row = page.getByTestId("route-row-route-4");
    await expect(row).toBeVisible();
    await expect(row.getByText("REC-004")).toBeVisible();

    // Open detail view for route-4
    await row.getByTestId("view-route-route-4").click();

    const detailView = page.getByTestId("route-detail-view");
    await expect(detailView).toBeVisible();
    await expect(detailView.getByText("REC-004")).toBeVisible();
    await expect(detailView.getByText("Recorrido Parque Industrial")).toBeVisible();

    // Initially has 1 stop (Zona Sur, 50 min)
    const initialStopsList = detailView.getByTestId("stops-list");
    await expect(initialStopsList).toBeVisible();
    await expect(initialStopsList.getByText("Zona Sur")).toBeVisible();
    await expect(initialStopsList.getByText("50 min")).toBeVisible();

    // Click "Editar secuencia"
    await detailView.getByTestId("edit-stops-button").click();

    // Verify Stop Sequence Builder is open
    const builder = detailView.getByTestId("stop-sequence-builder");
    await expect(builder).toBeVisible();
    await expect(builder.getByTestId("stop-item-0")).toBeVisible();

    // Attempt to add duplicate zone-2 (Zona Sur is already in the sequence)
    const zoneSelect = builder.getByTestId("stop-zone-select");
    await zoneSelect.selectOption("zone-2");
    await builder.getByTestId("add-stop-button").click();

    // Acceptance Criteria: Duplicate rejected client-side before submit
    const errorBox = builder.getByTestId("stop-editor-error");
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText(/Una zona no puede repetirse en el mismo recorrido/i);

    // Add zone-1 (Zona Norte, 40 min)
    await zoneSelect.selectOption("zone-1");
    const durationInput = builder.getByTestId("stop-duration-input");
    await durationInput.fill("40");
    await builder.getByTestId("add-stop-button").click();

    // Now 2 stops exist: index 0 (Zona Sur), index 1 (Zona Norte)
    await expect(builder.getByTestId("stop-item-0")).toContainText("Zona Sur");
    await expect(builder.getByTestId("stop-item-1")).toContainText("Zona Norte");

    // Reorder: move stop 1 (Zona Norte) up to position 1
    await builder.getByTestId("stop-move-up-1").click();

    // Verified flipped order: index 0 is Zona Norte, index 1 is Zona Sur
    await expect(builder.getByTestId("stop-item-0")).toContainText("Zona Norte");
    await expect(builder.getByTestId("stop-item-1")).toContainText("Zona Sur");

    // Save sequence: triggers single atomic PUT
    await builder.getByTestId("save-sequence-button").click();

    // Builder closes, updated sequence is displayed in order
    await expect(builder).not.toBeVisible();
    const updatedStopsList = detailView.getByTestId("stops-list");
    await expect(updatedStopsList).toBeVisible();

    const stopItems = updatedStopsList.locator("> div");
    await expect(stopItems.nth(0)).toContainText("Zona Norte");
    await expect(stopItems.nth(0)).toContainText("40 min");
    await expect(stopItems.nth(1)).toContainText("Zona Sur");
    await expect(stopItems.nth(1)).toContainText("50 min");
  });

  test("Office actor can clear stop sequence to empty and re-add from empty CTA", async ({
    page,
  }) => {
    await openRoutesCatalog(page);

    // Open detail view for route-4
    const row = page.getByTestId("route-row-route-4");
    await row.getByTestId("view-route-route-4").click();

    const detailView = page.getByTestId("route-detail-view");
    await expect(detailView).toBeVisible();

    // Click "Editar secuencia"
    await detailView.getByTestId("edit-stops-button").click();

    const builder = detailView.getByTestId("stop-sequence-builder");
    await expect(builder).toBeVisible();

    // Remove all stops
    while ((await builder.locator("[data-testid^='stop-remove-']").count()) > 0) {
      await builder.locator("[data-testid^='stop-remove-']").first().click();
    }

    await expect(builder.getByTestId("builder-empty-stops")).toBeVisible();

    // Save empty sequence: valid per acceptance criteria
    await builder.getByTestId("save-sequence-button").click();

    // Empty stops section is rendered with call-to-action
    await expect(builder).not.toBeVisible();
    const emptyStops = detailView.getByTestId("empty-stops-section");
    await expect(emptyStops).toBeVisible();
    await expect(emptyStops.getByText("Este recorrido no tiene paradas configuradas")).toBeVisible();

    // Click "Agregar paradas" CTA
    const addStopsCta = detailView.getByTestId("add-stops-cta");
    await expect(addStopsCta).toBeVisible();
    await addStopsCta.click();

    // Builder opens again from CTA
    await expect(builder).toBeVisible();
    await expect(builder.getByTestId("builder-empty-stops")).toBeVisible();

    // Add a stop and save
    await builder.getByTestId("stop-zone-select").selectOption("zone-1");
    await builder.getByTestId("stop-duration-input").fill("25");
    await builder.getByTestId("add-stop-button").click();
    await builder.getByTestId("save-sequence-button").click();

    // Stops list is back
    await expect(builder).not.toBeVisible();
    const stopsList = detailView.getByTestId("stops-list");
    await expect(stopsList).toBeVisible();
    await expect(stopsList).toContainText("Zona Norte");
    await expect(stopsList).toContainText("25 min");
  });
});
