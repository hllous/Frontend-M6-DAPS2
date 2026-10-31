import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { captureShot, expectBusyRegion, expectLanding, gateGets, LOADING_SIZES, measure } from "./support/loading-states";

const AREAS = [
  { name: "trees", path: "/app/catalog/trees", api: "**/api/trees?*", region: "Árboles registrados", table: "Catálogo de árboles", card: "main article" },
  { name: "tree interventions", path: "/app/catalog/tree-interventions", api: "**/api/tree-interventions?*", region: "Solicitudes de intervención", table: null, card: 'main [role="article"]' },
  { name: "green spaces", path: "/app/catalog/green-spaces", api: "**/api/green-spaces?*", region: "Espacios verdes registrados", table: "Espacios verdes registrados", card: null },
  { name: "green points", path: "/app/catalog/green-points", api: "**/api/green-points?*", region: "Puntos verdes registrados", table: "Catálogo de puntos verdes", card: 'main [data-slot="card"]' },
  { name: "containers", path: "/app/catalog/containers", api: "**/api/containers?*", region: "Contenedores registrados", table: "Inventario de contenedores registrados", card: null },
];

for (const size of LOADING_SIZES) {
  test.describe(`Catalogo A loading states at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const area of AREAS) {
      test(`${area.name} shows a busy skeleton region, then the content replaces it`, async ({ page }) => {
        await loginViaApi(page, "office-duty-queue");
        const release = await gateGets(page, area.api);
        await page.goto(area.path);

        const region = page.getByRole("region", { name: area.region });
        await expectBusyRegion(page, region);
        await captureShot(page, `${area.name.replaceAll(" ", "-")}-loading-${size.name}`);
        const mobileCards = size.width < 768 && area.card;
        const skeletonCard = mobileCards ? region.locator('[data-slot$="card-skeleton"]').first() : null;
        if (skeletonCard) await expect(skeletonCard).toBeVisible();
        const before = skeletonCard ? await measure(skeletonCard) : null;

        release();
        await expect(page.getByRole("region", { name: area.region, exact: true }).filter({ has: page.locator('[data-slot="skeleton"]') })).toHaveCount(0);
        if (area.table && size.width >= 768) await expect(page.getByRole("table", { name: area.table })).toBeVisible();
        if (mobileCards) {
          const loadedCard = page.locator(area.card!).first();
          await expect(loadedCard).toBeVisible();
          await expectLanding(before!, await measure(loadedCard), { height: 8 });
        }
        await captureShot(page, `${area.name.replaceAll(" ", "-")}-loaded-${size.name}`);
      });
    }
  });
}
