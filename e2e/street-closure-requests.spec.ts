import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const WIDE_VIEWPORT = { width: 1280, height: 900 };

async function openServiceDetail(page: import("@playwright/test").Page, scenarioId: "office-duty-queue" | "field-crew-leader-route") {
  await loginViaApi(page, scenarioId);
  await page.goto("/app?destination=services");
  await page.setViewportSize(WIDE_VIEWPORT);
  const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
  await expect(table.getByRole("row", { name: /SVC-1050/ })).toBeVisible();
  await table.getByRole("row", { name: /SVC-1050/ }).click();
  await page.getByRole("button", { name: "Ver detalle completo" }).click();
  await expect(page.getByRole("region", { name: /Detalle completo de SVC-1050/i })).toBeVisible();
}

test.describe("StreetClosureRequest from Service context", () => {
  test("Office creates a pending request with one and multiple sections and can edit the prefilled window", async ({ page }) => {
    await openServiceDetail(page, "office-duty-queue");

    await page.getByRole("button", { name: "Solicitar corte de calle" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("SVC-1050")).toBeVisible();
    await expect(dialog.getByLabel("Inicio solicitado *")).toHaveValue("2026-09-05T08:00");

    // The scheduled window is an editable review value, not an immutable copy.
    await dialog.getByLabel("Inicio solicitado *").fill("2026-09-05T09:00");
    await dialog.getByLabel("Fin solicitado *").fill("2026-09-05T13:00");
    await dialog.getByLabel("Motivo *").fill("El Servicio requiere circulación reducida durante el operativo.");

    // An empty structured collection is rejected before the request is created.
    await dialog.getByRole("button", { name: "Crear solicitud de corte" }).click();
    await expect(dialog.getByText("Indique el nombre de la calle")).toBeVisible();

    await dialog.getByLabel("Calle *", { exact: true }).fill("Bulevar Costero");
    await dialog.getByLabel("Desde calle transversal *").fill("Av. Belgrano");
    await dialog.getByLabel("Hasta calle transversal *").fill("Calle 12");

    await dialog.getByRole("button", { name: "Agregar tramo afectado" }).click();
    const streets = dialog.getByLabel("Calle *", { exact: true });
    await streets.nth(1).fill("Calle 12");
    await dialog.getByLabel("Desde calle transversal *").nth(1).fill("Bulevar Costero");
    await dialog.getByLabel("Hasta calle transversal *").nth(1).fill("Av. Libertad");
    await expect(streets).toHaveCount(2);

    await dialog.getByRole("button", { name: "Crear solicitud de corte" }).click();
    await expect(dialog.getByRole("status")).toContainText("Solicitud pendiente");
    await expect(dialog.getByText(/M6 creó el registro/i)).toBeVisible();
  });

  test("Field has no StreetClosureRequest creation entry point", async ({ page }) => {
    await openServiceDetail(page, "field-crew-leader-route");

    await expect(page.getByRole("button", { name: "Solicitar corte de calle" })).not.toBeVisible();
  });
});
