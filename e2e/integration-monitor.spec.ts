import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseDate, chooseOption } from "./support/reports-indicators";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function resetMockData(page: Page) {
  const response = await page.request.post("/api/mock/reset", {
    data: {},
    headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
  });
  expect(response.ok()).toBe(true);
}

test("monitor de integración: admin, auditor, filtros, reintentos y acceso @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginViaApi(page, "office-duty-queue");
  await resetMockData(page);
  await page.goto("/app/admin/integration-monitor");

  await expect(page.getByRole("heading", { level: 1, name: "Eventos" })).toBeVisible();
  await expect(page.getByLabel("Eventos fallidos", { exact: true })).toContainText("2 eventos fallidos");
  const eventsTable = page.getByRole("table", { name: "Eventos salientes" });
  await expect(eventsTable).toContainText("containerDamaged");
  await expect(eventsTable).not.toContainText("severity");
  await expectNoViolations(page);

  await chooseOption(page, "Estado", "Fallido");
  await page.getByRole("textbox", { name: "Tipo de evento" }).fill("containerDamaged");
  await chooseDate(page, "Desde", "2026-10-28");
  await chooseDate(page, "Hasta", "2026-10-28");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(eventsTable.getByRole("row")).toHaveCount(2);
  await expect(eventsTable).toContainText("containerDamaged");
  await expect(eventsTable).not.toContainText("environmentalReportReceived");

  await page.getByRole("link", { name: "Ver actividad de Contenedor" }).click();
  await expect(page).toHaveURL(/tab=activity/);
  const activityTab = page.getByRole("tab", { name: "Registro de actividad" });
  await expect(activityTab).toHaveAttribute("aria-selected", "true");
  const activityTable = page.getByRole("table", { name: "Registro de actividad" });
  await expect(activityTable).toContainText("Informó un daño");
  await expect(page.getByRole("textbox", { name: "Identificador de entidad" })).toHaveValue("550e8400-e29b-41d4-a716-446655440001");

  await page.getByRole("tab", { name: "Eventos salientes" }).click();
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByRole("button", { name: "Ver detalle de containerDamaged" }).click();
  const detail = page.getByRole("dialog", { name: "Detalle del evento" });
  await expect(detail).toContainText('"severity": "HIGH"');
  await page.getByRole("button", { name: "Reintentar evento" }).click();
  const confirmation = page.getByRole("dialog", { name: "Confirmar reintento" });
  await expect(confirmation).toContainText("mismo identificador del evento");
  await expect(confirmation).toContainText("no corrige un contenido que el sistema receptor haya rechazado");
  await page.getByRole("button", { name: "Confirmar reintento" }).click();
  const announcement = page.locator('p[role="status"][aria-live="polite"]');
  await expect(announcement).toContainText("El evento se reencoló y ahora está pendiente.");
  await expect(page.getByLabel("Eventos fallidos", { exact: true })).toContainText("1 evento fallido");

  await page.getByRole("button", { name: "Reintentar eventos fallidos" }).click();
  const bulkConfirmation = page.getByRole("dialog", { name: "Reintentar eventos fallidos" });
  await bulkConfirmation.getByRole("spinbutton", { name: "Límite de reintentos" }).fill("1");
  await bulkConfirmation.getByRole("button", { name: "Confirmar reintento masivo" }).click();
  await expect(announcement).toContainText("Se reencoló 1 evento; no quedan eventos fallidos.");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { level: 1, name: "Eventos" })).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.width);
  await expectNoViolations(page);

  await resetMockData(page);
  await loginViaApi(page, "office-limited-intake");
  await page.goto("/app/admin/integration-monitor");
  const mobileEventsList = page.getByRole("list", { name: "Eventos salientes" });
  await expect(mobileEventsList).toContainText("containerDamaged");
  await expect(mobileEventsList).not.toContainText("severity");
  await expect(page.getByRole("button", { name: /Ver detalle|Reintentar/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Registro de actividad" }).click();
  await expect(page.getByRole("list", { name: "Registro de actividad" })).toContainText("Informó un daño");
  await expectNoViolations(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginViaApi(page, "field-crew-leader-route");
  await page.goto("/app");
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Eventos" })).toHaveCount(0);
  await page.goto("/app/admin/integration-monitor");
  await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
});

test("monitor de integración: eventos recibidos y actor de sistema en el registro (#875)", async ({ page }) => {
  await resetMockData(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/admin/integration-monitor");

    await page.getByRole("tab", { name: "Eventos recibidos" }).click();
    const received = page.getByRole(viewport.width > 760 ? "table" : "list", { name: "Eventos recibidos" });
    await expect(received).toBeVisible();
    await expect(received).toContainText("workOrderCompleted");
    await expect(received).toContainText("Obras Públicas");
    await expect(received).toContainText("closureRequestId inexistente");
    const size = await page.evaluate(() => ({ width: window.innerWidth, documentWidth: document.documentElement.scrollWidth }));
    expect(size.documentWidth).toBeLessThanOrEqual(size.width);
    await expectNoViolations(page);

    await page.getByRole("tab", { name: "Registro de actividad" }).click();
    const activity = page.getByRole(viewport.width > 760 ? "table" : "list", { name: "Registro de actividad" });
    await expect(activity).toContainText("Sistema · Obras Públicas");
    await expect(activity).not.toContainText("system:m3");
  }
});
