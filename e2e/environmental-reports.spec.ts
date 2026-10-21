import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseDate, chooseOption, chooseTime } from "./support/reports-indicators";

test.describe("EnvironmentalReport case file", () => {
  test("Office can reach and select a status in the last group on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");

    const status = page.getByRole("combobox", { name: "Estado" });
    await status.click();
    const listbox = page.getByRole("listbox");
    const content = page.locator('[data-slot="select-content"]');
    const allStatuses = page.getByRole("option", { name: "Todos los estados" });
    const closed = page.getByRole("option", { name: "Cerrado" });
    const mobileNav = page.getByRole("navigation", { name: "Navegación móvil" });

    await expect(listbox).toBeVisible();
    const contentBox = await content.boundingBox();
    const navBox = await mobileNav.boundingBox();
    expect(contentBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(contentBox!.y + contentBox!.height).toBeLessThan(navBox!.y);

    for (let index = 0; index < 20 && !(await closed.evaluate((option) => option === document.activeElement)); index += 1) {
      await page.keyboard.press("ArrowDown");
    }

    await expect(closed).toBeFocused();
    await expect(closed).toBeInViewport();
    await page.keyboard.press("Enter");

    await expect(closed).toHaveAttribute("aria-selected", "true");
    await expect(allStatuses).toBeInViewport();
    await expect(status).toContainText("Cerrado");
  });

  test("Office filters the queue by several statuses and keeps them in the URL", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Control Ambiental" }).click();
    const filters = page.getByRole("region", { name: "Filtros de la cola" });
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    const status = filters.getByRole("combobox", { name: "Estado" });
    const allReportsResponse = await page.request.get("/api/environmental-reports?pageSize=100");
    expect(allReportsResponse.ok()).toBeTruthy();
    const allReports = (await allReportsResponse.json()).data as { id: string; status: string }[];
    const expectedIds = allReports
      .filter((report) => ["RECEIVED", "UNDER_REVIEW"].includes(report.status))
      .map((report) => report.id);

    await status.click();
    await page.getByRole("option", { name: "Recibido" }).click();
    await page.getByRole("option", { name: "En revisión" }).click();

    await expect(page).toHaveURL(/status=RECEIVED.*status=UNDER_REVIEW/);
    await expect(status).toContainText("Recibido, En revisión");
    await expect(list.getByRole("button")).toHaveCount(expectedIds.length);
    for (const id of expectedIds) {
      await expect(list.getByRole("button", { name: new RegExp(id) })).toBeVisible();
    }
  });

  test("Office filters the queue by last update and restores the range from the URL", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    const filters = page.getByRole("region", { name: "Filtros de la cola" });
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await expect(list.getByRole("button", { name: /ER-1004/ })).toBeVisible();
    await chooseDate(filters, "Desde", "2026-09-04");
    const filtered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/environmental-reports" && url.searchParams.get("from") === "2026-09-04" && url.searchParams.get("to") === "2026-09-05";
    });
    await chooseDate(filters, "Hasta", "2026-09-05");
    expect((await filtered).ok()).toBe(true);
    await expect(list.getByRole("button", { name: /ER-1004/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1006/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /ER-1003/ })).toHaveCount(0);
    await expect(page).toHaveURL(/from=2026-09-04.*to=2026-09-05/);
    await page.reload();
    await expect(filters.getByRole("button", { name: "Desde" })).toHaveText(/04\/09\/2026/);
    await expect(filters.getByRole("button", { name: "Hasta" })).toHaveText(/05\/09\/2026/);
    await expect(list.getByRole("button", { name: /ER-1003/ })).toHaveCount(0);
    await filters.getByRole("button", { name: "Limpiar fechas" }).click();
    await expect(list.getByRole("button", { name: /ER-1003/ })).toBeVisible();
    await expect(page).not.toHaveURL(/from=|to=/);
  });

  test("Office returns focus to the report after forwarding and issuing a notice", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    await expect(page.getByRole("main")).toHaveCount(1);
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
    await chooseDate(dialog, "Fecha de inspección", "2026-09-10");
    await chooseTime(dialog, "Inicio", "09:00");
    await chooseTime(dialog, "Fin", "10:30");
    await chooseOption(dialog, "Zona operativa", /Belgrano/);
    await chooseOption(dialog, "Cuadrilla", /Cuadrilla A/);
    await dialog.getByRole("button", { name: "Programar inspección" }).click();
    await expect(detail.getByRole("status", { name: "Estado: Inspección programada" })).toBeVisible();
    await expect(detail.getByText(/^SVC-/)).toBeVisible();
    await expect(detail.getByText(/Cuadrilla A/)).toBeVisible();
  });

  test("Office asks the neighbour for information and the report waits for the answer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    const list = page.getByRole("region", { name: "Cola de expedientes ambientales" });
    await list.getByRole("button", { name: /ER-1013/ }).click();
    const detail = page.getByRole("region", { name: "Detalle de ER-1013" });
    await detail.getByRole("button", { name: "Pedir información al vecino" }).click();
    const dialog = page.getByRole("dialog", { name: "Pedir información al vecino" });
    await dialog.getByLabel(/Qué se le pide al vecino/).fill("Una foto del frente, de noche.");
    await dialog.getByRole("button", { name: "Pedir información" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(detail.getByRole("status", { name: "Solicitud de información pendiente" })).toContainText("Una foto del frente, de noche.");
    await expect(detail.getByRole("button", { name: "Pedir información al vecino" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Derivar expediente" })).toHaveCount(0);
  });

  test("Field submits a report without exposing M2 reporter data", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=environment");
    await expect(page.getByRole("region", { name: "Reportes ambientales asignados" })).toBeVisible();
    await page.getByRole("button", { name: "Abrir reporte" }).click();
    const dialog = page.getByRole("dialog");
    await chooseOption(dialog, /Tipo de hallazgo/, "Ruidos molestos");
    await dialog.getByLabel(/Dirección o referencia/).fill("Calle Nueva 100");
    await dialog.getByLabel(/Descripción del hallazgo/).fill("Ruido nocturno constante.");
    await dialog.getByLabel(/Latitud/).fill("-34.6");
    await dialog.getByLabel(/Longitud/).fill("-58.4");
    await dialog.getByRole("button", { name: "Abrir reporte" }).click();
    await expect(page.getByText(/Expediente ER-/)).toBeVisible();
    await expect(page.getByText(/reporterSnapshot/i)).not.toBeVisible();
  });
});
