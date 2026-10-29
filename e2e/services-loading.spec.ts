import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];
const SHOTS = process.env.LOADING_SHOTS_DIR;

function shot(page: Page, name: string) {
  return SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve(null);
}

async function gateRoutes(page: Page, patterns: string[]) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  for (const pattern of patterns) await page.route(pattern, async (route) => { await gate; await route.continue(); });
  return release;
}

async function openDetailFromTable(page: Page, serviceId: string, search: string) {
  await page.getByPlaceholder(/^Buscar/).fill(search);
  const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
  await expect(table).toBeVisible();
  const row = table.locator(`tr[data-service-id="${serviceId}"]`);
  await row.scrollIntoViewIfNeeded();
  const box = (await row.getByRole("cell").nth(2).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole("button", { name: "Ver detalle" }).first().click();
}

for (const size of SIZES) {
  test.describe(`Servicios loading states at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("services table shows a skeleton, then the table lands in its place", async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/api/services?*", async (route) => { await gate; await route.continue(); });
      await page.route("**/api/services", async (route) => { await gate; await route.continue(); });
      await page.goto("/app?destination=services");

      const region = page.getByRole("region", { name: "Listado de servicios" });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await expect(region.getByRole("status")).toHaveText("Cargando");
      await expect(page.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);
      await shot(page, `after2-services-table-loading-${size.name}`);
      const loadingHead = (await page.locator('[data-slot="table-rows-skeleton"] thead th').first().boundingBox())!;
      const loadingPane = (await page.locator('[data-slot="table-rows-skeleton"]').boundingBox())!;

      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
      await expect(table).toBeVisible();
      await shot(page, `after2-services-table-loaded-${size.name}`);
      // Content lands where the skeleton was: same left edge and header position (±2px).
      const loadedHead = (await table.locator("thead th").first().boundingBox())!;
      const loadedPane = (await table.boundingBox())!;
      expect(Math.abs(loadedPane.x - loadingPane.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(loadedHead.y - loadingHead.y)).toBeLessThanOrEqual(2);

      // Real mouse: click the middle of a plain cell of the first row and see the preview open.
      const cell = table.locator("tbody tr").first().getByRole("cell").nth(2);
      await cell.scrollIntoViewIfNeeded();
      const box = (await cell.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      // On phones the preview covers the list, so assert the preview rather than the row.
      await expect(page.getByRole("complementary").first()).toBeVisible();
    });

    test("assign-crew dialog shows field skeletons, then the fields", async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      await page.goto("/app?destination=services");
      const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
      await expect(table).toBeVisible();

      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/api/service-types/*", async (route) => { await gate; await route.continue(); });

      const row = table.locator('tr[data-service-id="SVC-1043"]');
      await row.scrollIntoViewIfNeeded();
      const box = (await row.getByRole("cell").nth(2).boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.getByRole("button", { name: "Asignar cuadrilla" }).first().click();

      const dialog = page.getByRole("dialog");
      const region = dialog.getByRole("region", { name: "Datos de asignación" });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await expect(region.getByRole("status")).toHaveText("Cargando");
      await expect(dialog.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);
      await shot(page, `after2-assign-crew-loading-${size.name}`);

      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      const crew = dialog.getByRole("combobox", { name: /Cuadrilla asignada/i });
      await expect(crew).toBeEnabled();
      await shot(page, `after2-assign-crew-loaded-${size.name}`);
      await crew.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("option").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("service detail shows a derivaciones skeleton, then the list", async ({ page }) => {
      await loginViaApi(page, "field-crew-member-route");
      await page.goto("/app");
      const release = await gateRoutes(page, ["**/api/repair-requests*"]);
      const card = page.locator('[data-service-id="SVC-1112"]');
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "Abrir" }).click();
      const region = page.getByRole("region", { name: "Carga de derivaciones" });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await region.scrollIntoViewIfNeeded();
      await shot(page, `after2-service-detail-loading-${size.name}`);
      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      await shot(page, `after2-service-detail-loaded-${size.name}`);
    });

    test("zone execution panel shows an evidence skeleton, then the files", async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      await page.goto("/app?destination=services");
      const release = await gateRoutes(page, ["**/api/evidence*"]);
      await openDetailFromTable(page, "SVC-1061", "Recorrido 7");
      const region = page.getByRole("region", { name: "Evidencia de la zona" });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await region.scrollIntoViewIfNeeded();
      await shot(page, `after2-zone-panel-loading-${size.name}`);
      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      await shot(page, `after2-zone-panel-loaded-${size.name}`);
    });

    test("inspection panel shows a skeleton, then the form", async ({ page }) => {
      await loginViaApi(page, "field-crew-member-route");
      await page.goto("/app");
      const release = await gateRoutes(page, ["**/api/environmental-inspections/*"]);
      const card = page.locator('[data-service-id="SVC-1112"]');
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "Abrir" }).click();
      const region = page.getByRole("region", { name: "Inspección ambiental", exact: true });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await region.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await shot(page, `after2-inspection-panel-loading-${size.name}`);
      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      await region.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await shot(page, `after2-inspection-panel-loaded-${size.name}`);
    });

    test("map view shows a skeleton, then the map", async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      const release = await gateRoutes(page, ["**/api/containers*", "**/api/green-points*", "**/api/green-spaces*", "**/api/trees*"]);
      await page.goto("/app?destination=services");
      const region = page.getByRole("region", { name: "Mapa de servicios" });
      await expect(region).toHaveAttribute("aria-busy", "true");
      await shot(page, `after2-map-loading-${size.name}`);
      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      await expect(page.locator(".leaflet-container")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await shot(page, `after2-map-loaded-${size.name}`);
    });
  });
}
