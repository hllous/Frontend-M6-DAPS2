import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
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
  await table.getByRole("row", { name: new RegExp(serviceId) }).click();
  await page.getByRole("button", { name: "Ver detalle completo" }).click();
  await expect(page.getByRole("region", { name: new RegExp(`Detalle completo de ${serviceId}`, "i") })).toBeVisible();
}

test.describe("RepairRequest Service-sourced workflow", () => {
  test("Office can create a pending referral with independent safety risk and canonical context", async ({ page }) => {
    await openServiceDetail(page);
    await page.getByRole("button", { name: "Crear derivación de reparación" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Referral context: Servicio SVC-1043")).toBeVisible();
    await dialog.getByLabel("Tipo de daño").selectOption("BROKEN_SIDEWALK");
    await dialog.getByLabel("Severidad").selectOption("LOW");
    await dialog.getByLabel("Sí, implica riesgo para la seguridad pública").check();
    await dialog.getByLabel("Ubicación del daño").fill("Av. Rivadavia 2200");
    await dialog.getByRole("button", { name: "Crear derivación a M3" }).click();

    await expect(dialog.getByRole("status")).toContainText("pendiente de respuesta de M3");
    await expect(dialog.getByText("SVC-1043").last()).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Ver Servicio fuente/ })).toHaveAttribute("href", /detail=SVC-1043/);
  });

  test("Field has no RepairRequest creation entry point", async ({ page }) => {
    await openServiceDetail(page, "field-crew-leader-route", "SVC-1051");
    await expect(page.getByRole("button", { name: "Crear derivación de reparación" })).not.toBeVisible();
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
    await dialog.getByRole("button", { name: "Crear derivación a M3" }).click();

    await expect(dialog.getByRole("status")).toContainText("Unsent referral");
    await expect(dialog.getByLabel("Ubicación del daño")).toHaveValue("Calle 12 y Bulevar Costero");
  });
});
