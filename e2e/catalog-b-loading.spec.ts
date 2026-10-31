import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];
const SHOTS = process.env.LOADING_SHOTS_DIR;

const SCREENS = [
  { slug: "crews", api: "**/api/crews*", region: "Listado de cuadrillas", loaded: /Cuadrilla/ },
  { slug: "vehicles", api: "**/api/vehicles*", region: "Listado de vehículos", loaded: /AA 123 AA/ },
  { slug: "routes", api: "**/api/routes*", region: "Listado de recorridos", loaded: /./ },
  { slug: "zones", api: "**/api/zones*", region: "Listado de zonas operativas", loaded: /Belgrano/ },
  { slug: "disposal-sites", api: "**/api/disposal-sites*", region: "Listado de sitios de disposición", loaded: /./ },
  { slug: "service-types", api: "**/api/service-types*", region: "Listado de tipos de servicio", loaded: /./ },
  { slug: "service-frequencies", api: "**/api/service-frequencies*", region: "Listado de frecuencias de servicio", loaded: /./ },
];

function shot(page: Page, name: string) {
  return SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }) : Promise.resolve(null);
}

for (const size of SIZES) {
  test.describe(`Catalogo B loading states at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const screen of SCREENS) {
      test(`${screen.slug} shows a skeleton, then the table lands in its place`, async ({ page }) => {
        await loginViaApi(page, "office-duty-queue");
        let release!: () => void;
        const gate = new Promise<void>((resolve) => { release = resolve; });
        await page.route(screen.api, async (route) => {
          if (route.request().method() !== "GET") return route.continue();
          await gate;
          return route.continue();
        });
        await page.goto(`/app/catalog/${screen.slug}`);

        const region = page.getByRole("region", { name: screen.region });
        await expect(region).toHaveAttribute("aria-busy", "true");
        await expect(region.getByRole("status")).toHaveText("Cargando");
        await expect(page.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);
        await shot(page, `${screen.slug}-loading-${size.name}`);
        const skeletonBox = (await page.locator('[data-slot="table-rows-skeleton"]').boundingBox())!;

        release();
        await expect(region).toHaveCount(0);
        const table = page.locator("table").first();
        await expect(table).toBeVisible();
        await shot(page, `${screen.slug}-loaded-${size.name}`);
        const loadedBox = (await table.boundingBox())!;
        expect(Math.abs(loadedBox.x - skeletonBox.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(loadedBox.y - skeletonBox.y)).toBeLessThanOrEqual(2);
      });
    }

  });
}
