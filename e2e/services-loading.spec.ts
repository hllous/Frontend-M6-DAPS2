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
      await shot(page, `after-services-table-loading-${size.name}`);

      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
      await expect(table).toBeVisible();
      await shot(page, `after-services-table-loaded-${size.name}`);

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
      await shot(page, `after-assign-crew-loading-${size.name}`);

      release();
      await expect(region).toHaveAttribute("aria-busy", "false");
      const crew = dialog.getByRole("combobox", { name: /Cuadrilla asignada/i });
      await expect(crew).toBeEnabled();
      await shot(page, `after-assign-crew-loaded-${size.name}`);
      await crew.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("option").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });
}
