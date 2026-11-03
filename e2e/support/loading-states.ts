import { expect, type Locator, type Page } from "@playwright/test";

/** Where the loading/loaded screenshots of the catalog suites go (override with LOADING_SHOTS_DIR). */
export const SHOTS_DIR = process.env.LOADING_SHOTS_DIR ?? ".playwright-cli/525-fixes";

export const LOADING_SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

/** Holds every GET matching the pattern until `release()` is called. */
export async function gateGets(page: Page, pattern: string) {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await opened;
    return route.continue();
  });
  return release;
}

/** The region is announced as busy with a screen-reader-only "Cargando" and nothing visible says so. */
export async function expectBusyRegion(page: Page, region: Locator) {
  await expect(region).toHaveAttribute("aria-busy", "true");
  await expect(region.getByRole("status")).toHaveText("Cargando");
  await expect(page.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);
}

export async function captureShot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: false });
}

type Box = { x: number; y: number; width: number; height: number };

export async function measure(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Element has no bounding box");
  return box;
}

/** Loaded content lands where its skeleton was: same left/top edge and, when given, the same height within `height` px. */
export async function expectLanding(before: Box, after: Box, options: { height?: number } = {}) {
  expect(Math.abs(after.x - before.x), "left edge").toBeLessThanOrEqual(2);
  expect(Math.abs(after.y - before.y), "top edge").toBeLessThanOrEqual(2);
  if (options.height !== undefined) expect(Math.abs(after.height - before.height), "card height").toBeLessThanOrEqual(options.height);
}
