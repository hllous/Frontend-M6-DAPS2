import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// Septiembre de 2026 es el período con servicios en los datos de demostración.
const COBERTURA = "/app?destination=dashboards&family=coverage&from=2026-09-01&to=2026-09-30";

async function mouseClick(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("Control sin caja visible");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("Tableros: ajustes de la revisión del PO (#887)", () => {
  test("un solo botón alterna Gráfico y Tabla con el mouse", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");
    await expect(page.getByRole("button", { name: /^Más filtros - Mes/ })).toBeVisible();
    const zones = page.getByRole("region", { name: "¿Dónde se concentra?" });
    await expect(zones.getByRole("button", { name: "Ver gráfico" })).toHaveCount(0);
    await mouseClick(page, zones.getByRole("button", { name: "Ver tabla" }));
    await expect(zones.getByRole("table")).toBeVisible();
    await expect(zones.getByRole("button", { name: "Ver gráfico" })).toHaveAttribute("aria-pressed", "true");
    await mouseClick(page, zones.getByRole("button", { name: "Ver gráfico" }));
    await expect(zones.getByRole("button", { name: "Ver tabla" })).toHaveAttribute("aria-pressed", "false");
  });

  test("hover sobre la barra de cobertura y clic en un tramo abre la lista de servicios", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto(COBERTURA);
    const zonas = page.getByRole("table", { name: /Cobertura por zona/ });
    await expect(zonas).toBeVisible();
    const trigger = zonas.getByRole("button", { name: /Porcentajes de Norte/ });
    await trigger.scrollIntoViewIfNeeded();
    const box = (await trigger.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const popup = page.getByRole("dialog", { name: /Norte/ });
    await expect(popup.getByRole("link", { name: /^Atendidos.*75,9 %/ })).toBeVisible();
    await mouseClick(page, popup.locator('a[tabindex="-1"]').first());
    await expect.poll(() => { const url = new URL(page.url()); return [url.searchParams.get("destination"), url.searchParams.getAll("status").join(), url.searchParams.get("zone"), url.searchParams.get("from"), url.searchParams.get("to")]; }).toEqual(["services", "COMPLETED", "zone-3", "2026-09-01", "2026-09-30"]);
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(table.getByText("Inspección punto verde — Plaza San Martín")).toBeVisible();
    await mouseClick(page, table.getByRole("row").nth(1));
    await expect(page).toHaveURL(/selected=/);
    await expect(page.getByRole("link", { name: /Ver detalle/ }).or(page.getByRole("button", { name: /Ver detalle/ })).first()).toBeVisible();
  });

  test("el teclado abre el cuadro al enfocar la barra y Escape lo cierra", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto(COBERTURA);
    const trigger = page.getByRole("table", { name: /Cobertura por zona/ }).getByRole("button", { name: /Porcentajes de Norte/ });
    await page.waitForTimeout(1500);
    await page.mouse.move(2, 2);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    const popup = page.getByRole("dialog", { name: /Norte/ });
    await expect(popup).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(popup.getByRole("link", { name: /^Atendidos/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test.describe("con pantalla táctil", () => {
  test.use({ hasTouch: true });
  test("al tocar la barra se abre el cuadro y el tramo lleva a Servicios", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto(COBERTURA);
    await page.getByRole("tab", { name: "Territorio" }).click();
    const trigger = page.getByRole("button", { name: /Porcentajes de Norte/ }).first();
    // The Territorio tab re-renders its rows once data settles; wait for the stable bar before tapping.
    await expect(trigger).toBeVisible();
    await trigger.tap();
    const popup = page.getByRole("dialog", { name: /Norte/ });
    await expect(popup).toBeVisible();
    const row = popup.getByRole("link", { name: /^No atendidos/ });
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await row.tap();
    await expect.poll(() => { const url = new URL(page.url()); return [url.searchParams.getAll("status").join(), url.searchParams.get("zone"), url.searchParams.get("from"), url.searchParams.get("to")]; }).toEqual(["CANCELLED,SUSPENDED", "zone-3", "2026-09-01", "2026-09-30"]);
  });
  });

  test("«Tableros» de la barra lateral vuelve a la vista principal y conserva el período", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto(COBERTURA);
    await expect(page.getByRole("heading", { name: "Detalle de Cobertura" })).toBeVisible();
    await mouseClick(page, page.getByRole("link", { name: "Tableros" }));
    await expect(page.getByRole("heading", { name: "Detalle de Cobertura" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Detalle por familia" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Más filtros - 01\/09\/2026 – 30\/09\/2026/ })).toBeVisible();
    await expect(page).toHaveURL(/from=2026-09-01&to=2026-09-30/);
  });
});
