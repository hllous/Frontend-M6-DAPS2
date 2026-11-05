import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test("zonas: mouse cambia problema y tabla en escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=dashboards");
  const panel = page.getByRole("region", { name: "¿Dónde se concentra?" });
  await expect(panel).toContainText("Norte tiene 10 de los 24 objetivos sin atención.");
  for (const name of ["Contenedores desbordados ahora, por zona", "Ver tabla"]) {
    const button = panel.getByRole("button", { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error("Control sin caja visible");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await expect(panel).toContainText("Centro tiene 6 de los 14 contenedores desbordados ahora.");
  await expect(panel.getByRole("table").getByRole("row", { name: /Centro.*6/ })).toBeVisible();
});

test.describe("zonas en móvil", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("se apila y responde al toque", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");
    const panel = page.getByRole("region", { name: "¿Dónde se concentra?" });
    const coverage = page.getByRole("region", { name: "Cobertura por semana" });
    await expect(panel).toContainText("Norte tiene 10 de los 24 objetivos sin atención.");
    const panelBox = await panel.boundingBox();
    const coverageBox = await coverage.boundingBox();
    expect(panelBox!.y).toBeGreaterThan(coverageBox!.y + coverageBox!.height - 1);
    const button = panel.getByRole("button", { name: "Contenedores desbordados ahora, por zona" });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await button.tap();
    await expect(panel).toContainText("Centro tiene 6 de los 14 contenedores desbordados ahora.");
    await panel.getByRole("button", { name: "Ver tabla" }).tap();
    await expect(panel.getByRole("table").getByRole("row", { name: /Centro.*6/ })).toBeVisible();
  });
});
