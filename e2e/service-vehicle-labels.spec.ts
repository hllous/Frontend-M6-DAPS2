import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

const vehicleId = "b91bf270-025b-437d-a2d4-9f3be0963862";
const service = {
  id: "9837fac5-22f5-4a39-bdef-6eb029a7db6f",
  serviceTypeId: "st-street-cleaning", mode: "ROUTE", status: "SCHEDULED", origin: "MANUAL",
  scheduledDate: "2026-09-30T00:00:00.000Z", windowFrom: "08:00", windowTo: "12:00",
  crewId: "crew-b", vehicleId, zones: [{ zoneId: "zone-3", sequence: 1 }], zoneResults: [],
};
const meta = { total: 1, page: 1, pageSize: 100, totalPages: 1 };

for (const known of [true, false]) {
  test(`patente ${known ? "conocida" : "desconocida"} sin UUID en Oficina y Campo`, async ({ page }) => {
    await page.route("**/api/vehicles?*", (route) => route.fulfill({ json: {
      data: known ? [{ id: vehicleId, plate: "AB123CD", vehicleType: "COMPACTOR_TRUCK", capacity: 12, active: true }] : [], meta,
    } }));
    await page.route("**/api/services?*", (route) => route.fulfill({ json: { data: [service], meta } }));
    await page.route(`**/api/services/${service.id}`, (route) => route.fulfill({ json: service }));
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await page.getByRole("region", { name: "Tabla operativa de Servicios" }).getByRole("row", { name: new RegExp(service.id) }).click();
    const preview = page.locator("aside[aria-labelledby='preview-title']");
    await expect(preview.getByText(known ? "AB123CD" : "No asignado", { exact: true })).toBeVisible();
    await expect(preview.getByText(vehicleId, { exact: false })).toHaveCount(0);
    await preview.getByRole("button", { name: "Ver detalle completo" }).click();
    const detail = page.getByRole("region", { name: `Detalle completo de ${service.id}`, exact: true });
    await expect(detail.getByText(known ? "AB123CD" : "Sin vehículo", { exact: true })).toBeVisible();
    await expect(detail.getByText(vehicleId, { exact: false })).toHaveCount(0);

    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");
    const card = page.locator("li").filter({ hasText: service.id });
    await expect(card.getByText(known ? "Vehículo: AB123CD" : "Sin vehículo", { exact: true })).toBeVisible();
    await expect(card.getByText(vehicleId, { exact: false })).toHaveCount(0);
  });
}
