import { expect, type Locator, type Page, type Request } from "@playwright/test";

/** Where the loading/loaded screenshots of the catalog suites go (override with LOADING_SHOTS_DIR). */
export const SHOTS_DIR = process.env.LOADING_SHOTS_DIR ?? ".playwright-cli/525-fixes";

export const LOADING_SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

// Peticiones GET a /api que NO están retenidas por la compuerta y todavía no terminaron.
const ungatedInFlight = new WeakMap<Page, Set<Request>>();

function globToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("^" + escaped.replace(/\*\*\//g, "(?:.*/)?").replace(/\*/g, ".*") + "$");
}

/** Holds every GET matching the pattern until `release()` is called. */
export async function gateGets(page: Page, pattern: string) {
  const gated = globToRegExp(pattern);
  const inFlight = new Set<Request>();
  ungatedInFlight.set(page, inFlight);
  page.on("request", (request) => {
    if (request.method() === "GET" && new URL(request.url()).pathname.startsWith("/api/") && !gated.test(request.url())) inFlight.add(request);
  });
  page.on("requestfinished", (request) => inFlight.delete(request));
  page.on("requestfailed", (request) => inFlight.delete(request));
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
  // Otras lecturas de la pantalla (p. ej. las comunas del filtro de zonas) agregan controles encima de la tabla
  // cuando llegan: se espera a que terminen para medir el esqueleto en su posición final, sin dormir.
  await expect.poll(() => ungatedInFlight.get(page)?.size ?? 0, { message: "lecturas de la pantalla sin terminar" }).toBe(0);
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
