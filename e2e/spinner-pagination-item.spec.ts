import { expect, test, type Page } from "@playwright/test";

// Real components on the dev-only fixture route (src/app/prototype/ui-components).
const evidenceDir = process.env.EVIDENCE_DIR;
const section = (page: Page) => page.getByTestId("ui-spinner-pagination-item");
const height = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => el.getBoundingClientRect().height);

test.describe("shadcn Spinner, Pagination and Item", () => {
  for (const { name, width, vh, control } of [
    { name: "desktop", width: 1440, vh: 900, control: 40 },
    { name: "mobile", width: 390, vh: 844, control: 48 },
  ]) {
    test(`sizes at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height: vh });
      await page.goto("/prototype/ui-components");
      const s = section(page);
      await s.scrollIntoViewIfNeeded();

      expect(await height(s.getByRole("link", { name: "Página anterior" }))).toBeGreaterThanOrEqual(control);
      expect(await height(s.getByRole("link", { name: "Página siguiente" }))).toBeGreaterThanOrEqual(control);
      expect(await height(s.getByRole("link", { name: "1", exact: true }))).toBe(control);
      expect(await height(s.getByRole("link", { name: /Fila con enlace/ }))).toBeGreaterThanOrEqual(control);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      if (evidenceDir) {
        await s.screenshot({ path: `${evidenceDir}/spinner-pagination-item-${width}x${vh}.png` });
      }
    });
  }

  test("Spinner is a status named Cargando", async ({ page }) => {
    await page.goto("/prototype/ui-components");
    await expect(section(page).getByRole("status", { name: "Cargando" })).toBeVisible();
  });

  test("Pagination has Spanish names, current page and keyboard operation", async ({ page }) => {
    await page.goto("/prototype/ui-components");
    const nav = section(page).getByRole("navigation", { name: "Paginación" });
    await expect(nav.getByRole("link", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByText("Más páginas")).toBeAttached();

    await nav.getByRole("link", { name: "Página anterior" }).focus();
    await expect
      .poll(() =>
        nav.getByRole("link", { name: "Página anterior" }).evaluate((el) => {
          const st = getComputedStyle(el);
          return [st.outlineStyle, st.outlineWidth, st.outlineColor];
        }),
      )
      .toEqual(["solid", "3px", "rgb(35, 119, 189)"]);
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "1", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "2", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#pagina-2$/);
  });

  test("interactive Item is focusable, shows the ring and activates with Enter", async ({ page }) => {
    await page.goto("/prototype/ui-components");
    const row = section(page).getByRole("link", { name: /Fila con enlace/ });
    await row.focus();
    await expect(row).toBeFocused();
    await expect
      .poll(() => row.evaluate((el) => [getComputedStyle(el).outlineWidth, getComputedStyle(el).outlineColor]))
      .toEqual(["3px", "rgb(35, 119, 189)"]);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#detalle$/);
    await expect(section(page).getByText("Fila estática")).toBeVisible();
  });
});
