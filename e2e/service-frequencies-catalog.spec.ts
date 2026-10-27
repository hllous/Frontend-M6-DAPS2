import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBDate, chooseCatalogBOption, openCatalogBRowDetail } from "./support/catalog-612-controls";

test.describe("ServiceFrequency rule authoring #112", () => {
  test("Office creates, edits, and closes a rule without a generation action", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/service-frequencies"]').click();
    await expect(page).toHaveURL(/\/app\/catalog\/service-frequencies$/);

    await expect(page.getByRole("heading", { name: "Frecuencias de servicio" })).toBeVisible();
    await expect(page.getByRole("button", { name: /generar/i })).toHaveCount(0);

    const newButton = page.getByRole("button", { name: "Nueva frecuencia" });
    await newButton.click();
    const createDialog = page.getByRole("dialog", { name: "Nueva frecuencia" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(createDialog.getByRole("button", { name: "Lunes" })).toHaveAttribute("aria-pressed", "true");
    const typePicker = createDialog.getByRole("combobox", { name: "Tipo de servicio", exact: true });
    await expect(typePicker).toContainText("Seleccione un tipo de recorrido");
    await typePicker.click();
    await expect(page.getByRole("option", { name: /Mantenimiento de contenedores/ })).toHaveCount(0);
    await page.getByRole("option", { name: "Recolección domiciliaria · WASTE-ROUTE", exact: true }).click();
    await chooseCatalogBOption(page, createDialog.getByRole("combobox", { name: "Recorrido", exact: true }), "Recorrido Casco Histórico · REC-001");
    await chooseCatalogBDate(page, createDialog.getByRole("button", { name: "Válida desde", exact: true }), "2026-09-07");
    await expect(createDialog.getByRole("button", { name: "Válida desde", exact: true })).toContainText("07/09/2026");
    const createRequest = page.waitForRequest((request) => request.url().endsWith("/api/service-frequencies") && request.method() === "POST");
    await createDialog.getByRole("button", { name: "Crear frecuencia" }).click();
    expect((await createRequest).postDataJSON()).toEqual({ serviceTypeId: "st-waste-route", routeId: "route-1", weekdays: [1], shift: "MORNING", validFrom: "2026-09-07", validTo: null });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(newButton).toBeFocused();
    await expect(page.getByText(/Frecuencia creada/)).toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: "Recolección domiciliaria" }).last();
    await openCatalogBRowDetail(createdRow);
    await page.getByRole("dialog", { name: "Detalle de frecuencia de servicio" }).getByRole("button", { name: "Editar" }).click();
    const editDialog = page.getByRole("dialog", { name: "Editar frecuencia" });
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await chooseCatalogBOption(page, editDialog.getByRole("combobox", { name: "Turno", exact: true }), "Tarde");
    await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/Frecuencia actualizada/)).toBeVisible();

    const updatedRow = page.getByRole("row").filter({ hasText: "Recolección domiciliaria" }).last();
    await openCatalogBRowDetail(updatedRow);
    await page.getByRole("dialog", { name: "Detalle de frecuencia de servicio" }).getByRole("button", { name: "Cerrar vigencia" }).click();
    const closeDialog = page.getByRole("dialog", { name: "Confirmar cierre de vigencia" });
    await expect(closeDialog.getByRole("heading", { name: "Confirmar cierre de vigencia" })).toBeVisible();
    await closeDialog.getByRole("button", { name: "Cerrar vigencia" }).click();
    await expect(page.getByText(/Vigencia cerrada/)).toBeVisible();
  });
});
