import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseFieldOption, chooseFieldRadio } from "./support/services-608-controls";
import type { ScenarioId } from "../src/lib/scenarios";

async function openServiceDetail(
  page: import("@playwright/test").Page,
  scenario: ScenarioId = "office-duty-queue",
  serviceId = "SVC-1043",
) {
  await loginViaApi(page, scenario);
  await page.goto("/app?destination=services");
  const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
  await expect(table).toBeVisible();
  await table.locator(`tr[data-service-id="${serviceId}"]`).click();
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("region", { name: /Detalle completo de/i })).toBeVisible();
}

test.describe("RepairRequest Service-sourced workflow", () => {
  test("Office can create a pending referral with independent safety risk and canonical context", async ({ page }) => {
    await openServiceDetail(page);
    await page.getByRole("button", { name: "Crear derivación de reparación" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Servicio SVC-1043")).toBeVisible();
    await chooseFieldOption(dialog, "Tipo de daño", "Vereda hundida o rota");
    await chooseFieldOption(dialog, "Severidad", "Baja");
    await chooseFieldRadio(dialog, "Sí");
    await dialog.getByLabel("Ubicación del daño").fill("Av. Rivadavia 2200");
    await dialog.getByRole("button", { name: "Derivar" }).click();

    await expect(dialog.getByRole("status")).toContainText("Derivada a Obras Públicas");
    await expect(dialog.getByText("SVC-1043").last()).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Ver servicio/ })).toHaveAttribute("href", /detail=SVC-1043/);
  });

  test("Field can create a referral from assigned work", async ({ page }) => {
    await openServiceDetail(page, "field-crew-leader-route", "SVC-1051");
    await expect(page.getByRole("button", { name: "Crear derivación de reparación" })).toBeVisible();
    await expect(page.getByRole("button", { name: /corte de calle/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar derivación|cerrar derivación/i })).not.toBeVisible();
    await page.getByRole("button", { name: "Crear derivación de reparación" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Ubicación del daño").fill("Calle 12 y Bulevar Costero");
    await dialog.getByRole("button", { name: "Derivar" }).click();
    await expect(dialog.getByRole("status")).toContainText("Derivada a Obras Públicas");
    await expect(page.getByText("EnvironmentalInspection")).not.toBeVisible();
  });

  test("a failed submission is shown as an Unsent referral with retained values", async ({ page }) => {
    await page.route("**/api/repair-requests", async (route, request) => {
      if (request.method() === "POST") await route.abort();
      else await route.continue();
    });
    await openServiceDetail(page);
    await page.getByRole("button", { name: "Crear derivación de reparación" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Ubicación del daño").fill("Calle 12 y Bulevar Costero");
    await dialog.getByRole("button", { name: "Derivar" }).click();

    await expect(dialog.getByRole("status")).toContainText("Sin enviar");
    await expect(dialog.getByLabel("Ubicación del daño")).toHaveValue("Calle 12 y Bulevar Costero");
  });
});
