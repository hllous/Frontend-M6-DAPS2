import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("EnvironmentalReport case file", () => {
  test("Office returns focus to the report after forwarding and issuing a notice", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1011/ })).toBeVisible();
    await list.getByRole("button", { name: /ER-1001/ }).click();
    const detail = page.getByRole("region", { name: "Detalle de ER-1001" });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Iniciar revisión" }).click();
    await expect(detail.getByRole("status", { name: /En revisión/ })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Derivar expediente" })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Desestimar expediente" })).toBeVisible();

    const reportHeading = detail.getByRole("heading", { name: "Expediente ER-1001" });
    await detail.getByRole("button", { name: "Derivar expediente" }).click();
    const decisionDialog = page.getByRole("dialog", { name: "Derivar expediente" });
    const reason = decisionDialog.getByLabel(/Motivo/);
    await decisionDialog.getByRole("button", { name: "Derivar expediente" }).click();
    await expect(reason).toHaveAttribute("aria-invalid", "true");
    await expect(reason).toHaveAccessibleDescription("Debe indicar el motivo.");
    await reason.fill("Corresponde a otra dependencia.");
    await decisionDialog.getByRole("button", { name: "Derivar expediente" }).click();
    await expect(decisionDialog).not.toBeVisible();
    await expect(reportHeading).toBeFocused();

    await detail.getByRole("button", { name: "Volver a expedientes" }).click();
    const updatedList = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await updatedList.getByRole("button", { name: /ER-1008/ }).click();
    const noticeDetail = page.getByRole("region", { name: "Detalle de ER-1008" });
    const noticeHeading = noticeDetail.getByRole("heading", { name: "Expediente ER-1008" });
    await noticeDetail.getByRole("button", { name: "Emitir aviso de infracción" }).click();
    const noticeDialog = page.getByRole("dialog", { name: "Emitir aviso de infracción" });
    await noticeDialog.getByLabel(/Buscar establecimiento/).fill("EST-BOEDO-1880");
    await noticeDialog.getByRole("button", { name: "Buscar establecimiento" }).click();
    await expect(noticeDialog.getByText(/Planta de tratamiento Boedo/)).toBeVisible();
    await noticeDialog.getByRole("button", { name: "Emitir aviso de infracción" }).click();
    await expect(noticeDialog).not.toBeVisible();
    await expect(noticeHeading).toBeFocused();
  });

  test("Office schedules an inspection through the guided POINT flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await list.getByRole("button", { name: /ER-1002/ }).click();
    const detail = page.getByRole("region", { name: "Detalle de ER-1002" });
    await detail.getByRole("button", { name: "Programar inspección" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Fecha de inspección").fill("2026-09-10");
    await dialog.getByLabel("Zona operativa").selectOption("zone-1");
    await dialog.getByLabel("Cuadrilla").selectOption("crew-a");
    await dialog.getByRole("button", { name: "Programar inspección" }).click();
    await expect(detail.getByRole("status", { name: "Estado: Inspección programada" })).toBeVisible();
    await expect(detail.getByText(/^SVC-/)).toBeVisible();
    await expect(detail.getByText(/Cuadrilla A/)).toBeVisible();
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
