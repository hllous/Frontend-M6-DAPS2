import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { captureShot, expectBusyRegion, expectLanding, gateGets, LOADING_SIZES, measure } from "./support/loading-states";

const SCREENS = [
  { slug: "crews", api: "**/api/crews*", region: "Listado de cuadrillas", loaded: /Cuadrilla/ },
  { slug: "vehicles", api: "**/api/vehicles*", region: "Listado de vehículos", loaded: /AA 123 AA/ },
  { slug: "routes", api: "**/api/routes*", region: "Listado de recorridos", loaded: /Recorrido Casco Histórico/ },
  { slug: "zones", api: "**/api/zones*", region: "Listado de zonas operativas", loaded: /Belgrano/ },
  { slug: "disposal-sites", api: "**/api/disposal-sites*", region: "Listado de sitios de disposición", loaded: /Estación Norte/ },
  { slug: "service-types", api: "**/api/service-types*", region: "Listado de tipos de servicio", loaded: /Recolección domiciliaria/ },
  { slug: "service-frequencies", api: "**/api/service-frequencies*", region: "Listado de frecuencias de servicio", loaded: /Recolección domiciliaria/ },
];

for (const size of LOADING_SIZES) {
  test.describe(`Catalogo B loading states at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const screen of SCREENS) {
      test(`${screen.slug} shows a skeleton, then the table lands in its place`, async ({ page }) => {
        await loginViaApi(page, "office-duty-queue");
        const release = await gateGets(page, screen.api);
        await page.goto(`/app/catalog/${screen.slug}`);

        const region = page.getByRole("region", { name: screen.region });
        await expectBusyRegion(page, region);
        await captureShot(page, `${screen.slug}-loading-${size.name}`);
        const skeletonBox = await measure(page.locator('[data-slot="table-rows-skeleton"]'));

        release();
        await expect(region).toHaveCount(0);
        const table = page.locator("table").first();
        await expect(table).toBeVisible();
        await expect(table.getByText(screen.loaded).first()).toBeVisible();
        await captureShot(page, `${screen.slug}-loaded-${size.name}`);
        await expectLanding(skeletonBox, await measure(table));
      });
    }
  });
}
