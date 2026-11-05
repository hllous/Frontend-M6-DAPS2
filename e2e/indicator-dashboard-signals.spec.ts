import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function clickWithMouse(page: import("@playwright/test").Page, locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("El elemento no tiene caja visible");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("Tableros: Requiere atención (#861)", () => {
  test("escritorio: tarjetas con datos reales, período con el mouse y listas filtradas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    const section = page.getByRole("region", { name: "Requiere atención" });
    await expect(section.getByRole("group", { name: "Servicios sin realizar" })).toContainText("24");
    await expect(section.getByRole("group", { name: "Servicios fuera de horario" })).toContainText("46");
    await expect(section.getByRole("group", { name: "Contenedores desbordados" })).toContainText("2 menos que antes");
    await expect(page.getByRole("combobox", { name: "Familia" })).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Semana", exact: true })).toHaveCount(0);
    await clickWithMouse(page, page.getByRole("button", { name: "Más filtros" }));
    await clickWithMouse(page, page.getByRole("button", { name: "Semana", exact: true }));
    await expect(page.getByRole("button", { name: "Semana", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Desde/ })).toBeVisible();

    await clickWithMouse(page, section.getByRole("link", { name: "Ver lista de contenedores desbordados" }));
    await expect(page).toHaveURL(/\/app\/catalog\/containers\?status=OVERFLOWED/);
  });
});

test.describe("Tableros: Requiere atención en móvil (#861)", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("las tarjetas se apilan y «Ver lista» responde al toque", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    const cards = page.locator("[aria-labelledby^='signal-']");
    await expect(cards).toHaveCount(3);
    const xs = await cards.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);

    await page.getByRole("button", { name: "Más filtros" }).tap();
    await page.getByRole("button", { name: "Trimestre" }).tap();
    await expect(page.getByRole("button", { name: "Trimestre" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: "Ver lista de servicios sin realizar" }).tap();
    await expect(page).toHaveURL(/destination=services.*status=PARTIALLY_COMPLETED/);
  });
});
