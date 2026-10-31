import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

const AREAS = [
  { name: "trees", path: "/app/catalog/trees", api: "**/api/trees?*", region: "Árboles registrados", table: "Catálogo de árboles" },
  { name: "tree interventions", path: "/app/catalog/tree-interventions", api: "**/api/tree-interventions?*", region: "Solicitudes de intervención", table: null },
  { name: "green spaces", path: "/app/catalog/green-spaces", api: "**/api/green-spaces?*", region: "Espacios verdes registrados", table: "Espacios verdes registrados" },
  { name: "green points", path: "/app/catalog/green-points", api: "**/api/green-points?*", region: "Puntos verdes registrados", table: "Catálogo de puntos verdes" },
  { name: "containers", path: "/app/catalog/containers", api: "**/api/containers?*", region: "Contenedores registrados", table: "Inventario de contenedores registrados" },
];

async function gate(page: Page, pattern: string) {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => { await opened; await route.continue(); });
  return release;
}

for (const size of SIZES) {
  test.describe(`Catalogo A loading states at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const area of AREAS) {
      test(`${area.name} shows a busy skeleton region, then the content replaces it`, async ({ page }) => {
        await loginViaApi(page, "office-duty-queue");
        const release = await gate(page, area.api);
        await page.goto(area.path);

        const region = page.getByRole("region", { name: area.region });
        await expect(region).toHaveAttribute("aria-busy", "true");
        await expect(region.getByRole("status")).toHaveText("Cargando");
        await expect(page.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);

        release();
        await expect(page.getByRole("region", { name: area.region, exact: true }).filter({ has: page.locator('[data-slot="skeleton"]') })).toHaveCount(0);
        if (area.table && size.width >= 768) await expect(page.getByRole("table", { name: area.table })).toBeVisible();
      });
    }
  });
}
