import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const closureInput = (sourceId: string) => ({
  reason: "El Servicio necesita reducir la circulación durante el operativo.",
  sourceType: "SERVICE",
  sourceId,
  sourceModule: "M6",
  closureType: "PARTIAL",
  requestedFrom: "2026-09-05T08:00",
  requestedTo: "2026-09-05T12:00",
  affectedSections: [
    { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12" },
  ],
});

async function createClosure(page: import("@playwright/test").Page, sourceId: string) {
  await loginViaApi(page, "office-duty-queue");
  const response = await page.request.post("/api/street-closure-requests", {
    data: closureInput(sourceId),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string };
}

test.describe("StreetClosure dependency gate", () => {
  test("blocks a Field start for the entire linked ROUTE while the request is pending", async ({ page }) => {
    await createClosure(page, "SVC-1051");
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=work");

    const card = page.locator("li").filter({ hasText: "SVC-1051" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Iniciar servicio" }).click();

    await expect(card.getByRole("alert")).toContainText(/corte de calle.*pendiente/i);
    await expect(card.getByText("Programado")).toBeVisible();
  });

  test("does not choose an outcome automatically after M7 rejects the request", async ({ page }) => {
    const request = await createClosure(page, "SVC-1054");
    const rejection = await page.request.post(`/api/street-closure-requests/${request.id}/reject`);
    expect(rejection.ok()).toBeTruthy();

    await page.goto("/app?destination=services");
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(table.getByRole("row", { name: /SVC-1054/ })).toBeVisible();
    await table.getByRole("row", { name: /SVC-1054/ }).click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const gate = page.getByRole("status", { name: "Corte de calle rechazado" });
    await expect(gate).toContainText(/decidir explícitamente si reprogramar o cancelar/i);
    await expect(gate.getByRole("button", { name: "Reprogramar servicio por rechazo de corte" })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Cancelar servicio por rechazo de corte" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await gate.getByRole("button", { name: "Reprogramar servicio por rechazo de corte" }).click();
    await expect(page.getByRole("dialog")).toContainText(/Paso 1 de 2/i);
  });
});
