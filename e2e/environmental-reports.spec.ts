import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("EnvironmentalReport case file", () => {
  test("Office can inspect the complete queue and move a received report into review", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1011/ })).toBeVisible();
    await list.getByRole("button", { name: /ER-1001/ }).focus();
    await page.keyboard.press("Enter");
    const detail = page.getByRole("region", { name: "Detalle de ER-1001" });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Iniciar revisión" }).click();
    await expect(detail.getByRole("status", { name: /En revisión/ })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Derivar expediente" })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Desestimar expediente" })).toBeVisible();
  });

  test("Field submits a report without exposing M2 reporter data", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=environment");
    await expect(page.getByRole("region", { name: "Reportes ambientales asignados" })).toBeVisible();
    await page.getByRole("button", { name: "Abrir reporte" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Tipo de hallazgo/).selectOption("NOISE");
    await dialog.getByLabel(/Dirección o referencia/).fill("Calle Nueva 100");
    await dialog.getByLabel(/Descripción del hallazgo/).fill("Ruido nocturno constante.");
    await dialog.getByLabel(/Latitud/).fill("-34.6");
    await dialog.getByLabel(/Longitud/).fill("-58.4");
    await dialog.getByRole("button", { name: "Abrir reporte" }).click();
    await expect(page.getByText(/Expediente ER-/)).toBeVisible();
    await expect(page.getByText(/reporterSnapshot/i)).not.toBeVisible();
  });
});
