import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = "http://localhost:4314";
const output = path.resolve("review-394-animations");
const browser = await chromium.launch({ headless: true });

async function signIn(page, mobile = false) {
  await page.goto(`${base}/app?destination=services`, { waitUntil: "domcontentloaded" });
  assert.equal(new URL(page.url()).pathname, "/login", "signed-out visits redirect to login");
  assert.equal(new URL(page.url()).searchParams.get("destination"), "services");
  await page.getByRole("heading", { name: "Ingresar al sistema operativo" }).waitFor({ timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.getByLabel("Escenario operativo").selectOption("office-duty-queue");
  const loginResponse = page.waitForResponse((response) =>
    response.url().includes("/api/session/login") && response.request().method() === "POST",
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  assert.equal((await loginResponse).status(), 200, "office-duty-queue sign-in succeeds");
  await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).waitFor({ timeout: 45000 });
  const signedInUrl = new URL(page.url());
  assert.equal(signedInUrl.pathname, "/app");
  assert.equal(signedInUrl.searchParams.get("destination"), "services");
  assert.equal(signedInUrl.searchParams.has("variant"), false, "the single option works without a variant query");
  assert.equal(await page.getByRole("group", { name: "Elegir opción de columnas" }).count(), 0,
    "there is no floating column-option switcher");

  if (mobile) await page.getByRole("button", { name: "Lista", exact: true }).click();
  const tableRegion = page.getByRole("region", { name: "Tabla operativa de Servicios" });
  await tableRegion.locator('table[aria-label="Servicios operativos"]').waitFor({ timeout: 45000 });
  await tableRegion.locator('tr[data-service-id="SVC-1043"] button[data-service-select]')
    .waitFor({ timeout: 45000 });
  await page.waitForTimeout(350);
}

async function columnOrder(page) {
  return page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key]')
    .evaluateAll((headers) => headers.map((header) => header.getAttribute("data-column-key")));
}

async function splitMetrics(page) {
  return page.evaluate(() => {
    const map = document.querySelector('[aria-label="Mapa territorial de Servicios"]');
    const tableRegion = document.querySelector('[aria-label="Tabla operativa de Servicios"]');
    const table = tableRegion?.querySelector('table[aria-label="Servicios operativos"]');
    const mapBox = map?.getBoundingClientRect();
    const regionBox = tableRegion?.getBoundingClientRect();
    const tableBox = table?.getBoundingClientRect();
    const size = (box) => box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
    return {
      map: size(mapBox),
      tableRegion: size(regionBox),
      table: size(tableBox),
      tableFill: regionBox && tableBox ? tableBox.width / regionBox.width : 0,
    };
  });
}

async function dragElement(page, source, targetPoint) {
  const box = await source.boundingBox();
  assert.ok(box, "drag source is visible");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 4, startY, { steps: 2 });
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function reorderHeader(page) {
  const before = await columnOrder(page);
  const source = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="zone"]');
  const target = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="service"]');
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert.ok(sourceBox && targetBox, "source and target headers are visible");

  await page.mouse.move(sourceBox.x + 1, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 19, sourceBox.y + sourceBox.height / 2, { steps: 3 });
  const ghost = page.locator('[data-column-drag-ghost="zone"]');
  await ghost.waitFor({ state: "visible" });
  const ghostDetails = await ghost.evaluate((element) => ({
    text: element.textContent ?? "",
    cells: element.querySelectorAll("tbody td").length,
  }));
  assert.ok(ghostDetails.text.includes("Zona"), "drag feedback includes the column header");
  assert.ok(ghostDetails.cells > 0, "drag feedback shows the full column block");
  const width = page.viewportSize()?.width ?? 0;
  await ghost.screenshot({ path: path.join(output, `round2-column-block-${width}.png`) });

  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await columnOrder(page);
  assert.notDeepEqual(after, before, "dragging the header reorders the column");
  return { before, after, ghost: ghostDetails };
}

async function resizeColumn(page) {
  const handle = page.getByRole("slider", { name: "Ancho de columna Zona" });
  await handle.waitFor({ state: "visible" });
  const before = Number(await handle.getAttribute("aria-valuenow"));
  const header = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="zone"]');
  const [handleBox, headerBox, markerBox] = await Promise.all([
    handle.boundingBox(),
    header.boundingBox(),
    handle.locator("span").boundingBox(),
  ]);
  assert.ok(handleBox && headerBox && markerBox, "resize edge and marker are visible");
  const verticalOffset = (markerBox.y + markerBox.height / 2) - (headerBox.y + headerBox.height / 2);
  const borderOffset = (markerBox.x + markerBox.width / 2) - (headerBox.x + headerBox.width);
  assert.ok(Math.abs(verticalOffset) <= 3, `resize marker is vertically centered (offset=${verticalOffset.toFixed(1)}px)`);
  assert.ok(Math.abs(borderOffset) <= 5, `resize marker is centered on the column edge (offset=${borderOffset.toFixed(1)}px)`);
  const width = page.viewportSize()?.width ?? 0;
  await header.screenshot({ path: path.join(output, `round2-resize-marker-${width}.png`) });
  await dragElement(page, handle, {
    x: handleBox.x + handleBox.width / 2 + 44,
    y: handleBox.y + handleBox.height / 2,
  });
  const after = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(after, before, "dragging the column edge changes its width");
  return { before, after, verticalOffset, borderOffset };
}

async function verifyKeyboardEditing(page) {
  const beforeOrder = await columnOrder(page);
  const statusHeader = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="status"]');
  await statusHeader.focus();
  await statusHeader.press("Alt+ArrowLeft");
  const afterOrder = await columnOrder(page);
  assert.notDeepEqual(afterOrder, beforeOrder, "Alt+Arrow reorders the focused header");

  const handle = page.getByRole("slider", { name: "Ancho de columna Zona" });
  await handle.focus();
  const beforeWidth = Number(await handle.getAttribute("aria-valuenow"));
  await handle.press("ArrowRight");
  const afterWidth = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(afterWidth, beforeWidth, "arrow keys resize a focused column edge");
  return { beforeOrder, afterOrder, beforeWidth, afterWidth };
}

async function inspectHeaderAndFilters(page) {
  const isMobile = (page.viewportSize()?.width ?? 1440) < 760;
  assert.equal(await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).count(), 1,
    "the workspace title appears once");
  assert.equal(await page.getByPlaceholder(isMobile ? "Buscar" : /Buscar servicio, zona o cuadrilla/).count(), 1,
    "the service search copy appears once");
  assert.equal(await page.getByLabel("Período").count(), 1, "the period filter appears once");
  assert.equal(await page.getByRole("button", { name: "Categorías", exact: true }).count(), 1,
    "the data control appears once");
  const toolbar = page.locator("[data-services-filter-toolbar]");
  const toolbarText = await toolbar.innerText();
  assert.ok(toolbarText.includes("Período"), "the filter bar contains the period control");
  assert.ok(toolbarText.includes("Categorías"), "the filter bar contains the data control");
  assert.equal(/Servicios Urbanos|Buscar servicio/.test(toolbarText), false,
    "the title and search copy are not repeated below the period filter");
  assert.equal(await page.getByText("Servicios Urbanos / Buscar servicio, zona o cuadrilla…", { exact: true }).count(), 0,
    "the combined duplicate header copy is absent");

  const viewport = page.viewportSize();
  const headingBox = await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).boundingBox();
  const toolbarBox = await toolbar.boundingBox();
  assert.ok(viewport && headingBox && toolbarBox, "the title and filter bar are visible");
  const x = viewport.width < 760 ? 0 : Math.max(0, headingBox.x - 24);
  const y = Math.max(0, headingBox.y - 12);
  const bottom = Math.min(viewport.height, toolbarBox.y + toolbarBox.height + 8);
  await page.screenshot({
    path: path.join(output, `round2-header-filter-${viewport.width}.png`),
    clip: { x, y, width: viewport.width - x, height: bottom - y },
  });
  return { toolbarText, headingCount: 1, searchCount: 1 };
}

async function inspectDataMenu(page) {
  const toolbar = page.getByRole("button", { name: "Categorías", exact: true });
  const [toolbarBox, periodBox, toolbarRegion] = await Promise.all([
    toolbar.boundingBox(),
    page.getByLabel("Período").boundingBox(),
    page.locator("[data-services-filter-toolbar]").boundingBox(),
  ]);
  assert.ok(toolbarBox && periodBox && toolbarRegion, "the period and data controls are visible");
  assert.ok(toolbarBox.x > periodBox.x, "Categorías sits to the right of Periodo");
  assert.ok(toolbarBox.x + toolbarBox.width >= toolbarRegion.x + toolbarRegion.width - 20,
    "Categorías is aligned to the right edge of the filter bar");
  assert.equal(await toolbar.locator("svg").count(), 0, "the Categorías button is text-only");

  await toolbar.click();
  const menu = page.locator('[data-slot="dropdown-menu-content"]');
  await menu.waitFor({ state: "visible" });
  const items = page.getByRole("menuitemcheckbox");
  assert.deepEqual((await items.allTextContents()).map((value) => value.trim()).sort(), ["Equipo", "Estado", "Fecha", "Zona"],
    "the shadcn menu lists only hideable columns");
  assert.equal(await page.getByRole("menuitemcheckbox", { name: "Servicio" }).count(), 0,
    "Servicio is omitted from the menu");
  assert.equal(await page.getByRole("menuitemcheckbox", { name: "#" }).count(), 0,
    "the ordinal column is omitted from the menu");
  assert.equal(await page.getByText("Siempre visible", { exact: true }).count(), 0,
    "fixed columns have no explanatory copy");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="ordinal"]').count(), 1);
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="service"]').count(), 1);

  const checkedItems = await items.evaluateAll((elements) => elements.map((element) => ({
    checked: element.getAttribute("aria-checked") === "true",
    indicators: element.querySelectorAll("svg").length,
  })));
  assert.ok(checkedItems.every((item) => item.checked && item.indicators === 1),
    "checked menu items show one check indicator");
  const viewportWidth = page.viewportSize()?.width ?? 0;
  await menu.screenshot({ path: path.join(output, `round2-data-menu-checked-${viewportWidth}.png`) });

  const zone = page.getByRole("menuitemcheckbox", { name: "Zona" });
  await zone.focus();
  await zone.press("Space");
  await page.waitForFunction(() => [...document.querySelectorAll('[role="menuitemcheckbox"]')]
    .find((item) => item.textContent?.trim() === "Zona")?.getAttribute("aria-checked") === "false");
  assert.equal(await zone.getAttribute("aria-checked"), "false", "Space hides Zona through the keyboard");
  assert.equal(await zone.locator("svg").count(), 0, "unchecked items show no filled check indicator");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="zone"]').count(), 0,
    "turning off Zona hides it from the table");
  await menu.screenshot({ path: path.join(output, `round2-data-menu-unchecked-${viewportWidth}.png`) });

  await zone.press("Space");
  assert.equal(await zone.getAttribute("aria-checked"), "true", "Space restores Zona through the keyboard");
  assert.equal(await zone.locator("svg").count(), 1, "checked items regain the check indicator");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="zone"]').count(), 1,
    "turning on Zona shows it again");

  const crew = page.getByRole("menuitemcheckbox", { name: "Equipo" });
  await crew.click();
  assert.equal(await crew.getAttribute("aria-checked"), "false", "Equipo can be hidden");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="crew"]').count(), 0,
    "turning off Equipo hides it from the table");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  return { visibleChoices: ["Estado", "Zona", "Equipo", "Fecha"], fixedColumnsLocked: true, uncheckedIndicatorCount: 0 };
}

function channels(color) {
  const srgb = color.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) return srgb.slice(1).map(Number);
  const values = color.match(/[\d.]+/g)?.slice(0, 3).map((value) => Number(value) / 255);
  return values ?? [];
}

async function verifyTint(page, state) {
  assert.equal(await page.locator("[data-column-editor]").getAttribute("data-preview-open"), state);
  await page.waitForTimeout(350);
  const tones = await page.evaluate(() => {
    const selected = document.querySelector('table[aria-label="Servicios operativos"] tbody tr[aria-selected="true"]');
    const unselected = document.querySelector('table[aria-label="Servicios operativos"] tbody tr[aria-selected="false"]');
    const surfaceProbe = document.createElement("span");
    surfaceProbe.style.backgroundColor = "var(--color-surface)";
    (selected?.parentElement ?? document.body).append(surfaceProbe);
    const normalSurface = getComputedStyle(surfaceProbe).backgroundColor;
    surfaceProbe.remove();
    const read = (row) => {
      if (!row) return null;
      const style = getComputedStyle(row);
      const color = style.backgroundColor;
      const srgb = color.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
      const rgb = srgb
        ? srgb.slice(1).map(Number)
        : color.match(/[\d.]+/g)?.slice(0, 3).map((channel) => Number(channel) / 255) ?? [];
      return {
        backgroundColor: color,
        filter: style.filter,
        opacity: style.opacity,
        isNormal: color === normalSurface,
        isLightTint: rgb.length === 3 && rgb.every((channel) => channel >= 0.93 && channel < 1),
      };
    };
    return { selected: read(selected), unselected: read(unselected), normalSurface };
  });
  assert.ok(tones.unselected, "at least one non-selected service row is visible");
  assert.equal(tones.unselected.filter, "none");
  assert.equal(tones.unselected.opacity, "1");
  assert.equal(tones.unselected.isLightTint, true, "non-selected rows have a subtle light-gray tint");
  if (tones.selected) {
    assert.equal(tones.selected.filter, "none");
    assert.equal(tones.selected.opacity, "1");
    assert.equal(tones.selected.isNormal, true, "the selected row keeps its normal surface");
  }

  const width = page.viewportSize()?.width ?? 0;
  for (const [name, selector] of [
    ["selected", 'tr[aria-selected="true"]'],
    ["unselected", 'tr[aria-selected="false"]'],
  ]) {
    const row = page.locator(`table[aria-label="Servicios operativos"] tbody ${selector}`).first();
    if (await row.count() && await row.isVisible()) {
      await row.screenshot({ path: path.join(output, `round2-${name}-${state}-${width}.png`) });
    }
  }
  return tones;
}

async function verifySplitAndClose(page) {
  const separator = page.getByRole("separator", { name: "Ajustar ancho entre mapa y tabla" });
  await separator.waitFor({ state: "visible" });
  const start = await splitMetrics(page);
  const handleBox = await separator.boundingBox();
  assert.ok(handleBox, "the middle split handle is visible");
  await dragElement(page, separator, {
    x: Math.max(420, handleBox.x - 270),
    y: handleBox.y + handleBox.height / 2,
  });
  const maximized = await splitMetrics(page);
  assert.ok((maximized.map?.width ?? 0) < (start.map?.width ?? 0) - 100,
    "dragging the split enlarges the table pane");
  assert.ok(maximized.tableFill >= 0.96, `the table fills the pane at max share (${maximized.tableFill})`);
  await page.getByRole("region", { name: "Tabla operativa de Servicios" }).screenshot({
    path: path.join(output, "round2-table-max-1440.png"),
  });

  const mapWidthBeforeSelect = maximized.map?.width ?? 0;
  await page.locator('tr[data-service-id="SVC-1043"] button[data-service-select]').click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
  const open = await splitMetrics(page);
  assert.ok(Math.abs((open.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "selecting a row and opening details do not reset the split");
  const openTones = await verifyTint(page, "true");

  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "hidden" });
  const closed = await splitMetrics(page);
  assert.ok(Math.abs((closed.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "closing details does not reset the split");
  const closedTones = await verifyTint(page, "false");
  return { start, maximized, open, closed, openTones, closedTones };
}

async function verifyPeriodInPlace(page) {
  const select = page.getByLabel("Período");
  const before = await select.inputValue();
  const options = await select.locator("option").evaluateAll((items) => items.map((item) => item.value));
  const next = options.includes("semana") ? "semana" : options.find((value) => value !== before);
  assert.ok(next, "another period option is available");
  const previousUrl = new URL(page.url());
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await select.selectOption(next);
  await page.waitForFunction(() => document.querySelector('[aria-busy="true"]') === null, undefined, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(450);
  const nextUrl = new URL(page.url());
  assert.equal(nextUrl.pathname, previousUrl.pathname);
  assert.equal(nextUrl.searchParams.get("destination"), "services");
  assert.equal(nextUrl.searchParams.has("variant"), false);
  assert.equal(await page.evaluate(() => performance.getEntriesByType("navigation").length), 1,
    "Periodo does not start a new document load");
  assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin,
    "Periodo keeps the same document");
  assert.equal(await select.inputValue(), next, "the selected period updates in place");

  const emptyCopy = "No hay servicios para mostrar en este período.";
  const tableCount = await page.getByText(emptyCopy, { exact: true }).count();
  assert.ok(tableCount <= 1, "the table has at most one period empty-state message");
  assert.equal(await page.getByText("No hay servicios en este período.", { exact: true }).count(), 0,
    "the duplicate period banner is absent");
  assert.equal(await page.locator('[aria-label="Mapa territorial de Servicios"]').getByText(emptyCopy, { exact: true }).count(), 0,
    "the map does not repeat the table empty state");
  return { before, after: next, sameDocument: true, emptyStateCount: tableCount };
}

async function verifyPersistence(page, widthBeforeReload, orderBeforeReload) {
  const preferenceKeys = await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("m6:services-columns:v1:")));
  assert.ok(preferenceKeys.some((key) => key.endsWith(":1")), "column settings are scoped to the user");
  const splitKey = await page.evaluate(() => Object.keys(localStorage)
    .find((key) => key.startsWith("m6:services-workspace-split:v1:")));
  const savedSplit = splitKey ? await page.evaluate((key) => localStorage.getItem(key), splitKey) : null;
  assert.ok(savedSplit, "the user split is stored");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).waitFor({ timeout: 45000 });
  await page.waitForTimeout(350);
  assert.equal(new URL(page.url()).searchParams.has("variant"), false);
  const reloadedOrder = await columnOrder(page);
  assert.deepEqual(reloadedOrder, orderBeforeReload, "column order persists after reload");
  assert.equal(Number(await page.getByRole("slider", { name: "Ancho de columna Zona" }).getAttribute("aria-valuenow")), widthBeforeReload,
    "column width persists after reload");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="crew"]').count(), 0,
    "column visibility persists after reload");
  const reloadedSplit = await splitMetrics(page);
  const splitState = JSON.parse(savedSplit);
  assert.ok(splitState["map-pane"] <= 36, "the widest table split is saved");
  const mapShare = (reloadedSplit.map?.width ?? 0) /
    ((reloadedSplit.map?.width ?? 0) + (reloadedSplit.tableRegion?.width ?? 0)) * 100;
  assert.ok(Math.abs(mapShare - splitState["map-pane"]) <= 4, "the split persists after reload");
  assert.ok(reloadedSplit.tableFill >= 0.96, "the reloaded table fills its pane");
  return { preferenceKeys, savedSplit, reloadedOrder, reloadedSplit };
}

async function runDesktop() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: output, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await signIn(page);
    assert.equal(await page.locator("[data-column-editor]").getAttribute("data-column-editor"), "1");
    const header = await inspectHeaderAndFilters(page);
    const reorder = await reorderHeader(page);
    const resize = await resizeColumn(page);
    const keyboard = await verifyKeyboardEditing(page);
    const editor = await inspectDataMenu(page);
    const split = await verifySplitAndClose(page);
    const period = await verifyPeriodInPlace(page);
    const orderBeforeReload = await columnOrder(page);
    const widthBeforeReload = Number(await page.getByRole("slider", { name: "Ancho de columna Zona" }).getAttribute("aria-valuenow"));
    const persistence = await verifyPersistence(page, widthBeforeReload, orderBeforeReload);
    assert.deepEqual(pageErrors, [], "the desktop page has no browser errors");
    const video = page.video();
    await context.close();
    const videoPath = path.join(output, "round2-single-option.webm");
    await fs.rm(videoPath, { force: true });
    await fs.rename(await video.path(), videoPath);
    return { viewport: "1440x900", header, reorder, resize, keyboard, editor, split, period, persistence, pageErrors, video: videoPath };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round2-single-desktop-failure.png"), fullPage: true }).catch(() => {});
    await context.close();
    throw error;
  }
}

async function verifyMobilePersistence(page, widthBeforeReload, orderBeforeReload) {
  const preferenceKeys = await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("m6:services-columns:v1:")));
  assert.ok(preferenceKeys.some((key) => key.endsWith(":1")), "mobile preferences are scoped to the user");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.getByRole("region", { name: "Tabla operativa de Servicios" })
    .locator('table[aria-label="Servicios operativos"]')
    .waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  const reloadedOrder = await columnOrder(page);
  assert.deepEqual(reloadedOrder, orderBeforeReload, "mobile column order persists after reload");
  assert.equal(Number(await page.getByRole("slider", { name: "Ancho de columna Zona" }).getAttribute("aria-valuenow")), widthBeforeReload,
    "mobile column width persists after reload");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="crew"]').count(), 0,
    "mobile column visibility persists after reload");
  return { preferenceKeys, reloadedOrder };
}

async function runMobile() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await signIn(page, true);
    const header = await inspectHeaderAndFilters(page);
    await page.getByRole("region", { name: "Tabla operativa de Servicios" }).screenshot({
      path: path.join(output, "round2-table-390.png"),
    });
    const reorder = await reorderHeader(page);
    const resize = await resizeColumn(page);
    const keyboard = await verifyKeyboardEditing(page);
    const editor = await inspectDataMenu(page);
    const drawer = page.locator('[aria-label="Lista de servicios"]');
    const drawerBefore = await drawer.boundingBox();
    await page.locator('tr[data-service-id="SVC-1043"] button[data-service-select]').click();
    await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
    const openTint = await verifyTint(page, "true");
    const drawerAfter = await drawer.boundingBox();
    assert.ok(drawerBefore && drawerAfter, "the mobile list drawer remains available");
    assert.ok(Math.abs(drawerBefore.height - drawerAfter.height) <= 2, "row selection does not resize the mobile list");
    const close = page.getByRole("button", { name: "Cerrar vista previa" });
    await close.click();
    await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "hidden" });
    const closedTint = await verifyTint(page, "false");
    const period = await verifyPeriodInPlace(page);
    const orderBeforeReload = await columnOrder(page);
    const widthBeforeReload = Number(await page.getByRole("slider", { name: "Ancho de columna Zona" }).getAttribute("aria-valuenow"));
    const persistence = await verifyMobilePersistence(page, widthBeforeReload, orderBeforeReload);
    await page.locator("[data-column-editor]").screenshot({
      path: path.join(output, "round2-workspace-390.png"),
    });
    assert.deepEqual(pageErrors, [], "the mobile page has no browser errors");
    return { viewport: "390x844", header, reorder, resize, keyboard, editor, openTint, closedTint, drawerBefore, drawerAfter, period, persistence, pageErrors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round2-single-mobile-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

let result;
try {
  result = { desktop: await runDesktop(), mobile: await runMobile() };
} finally {
  await browser.close();
}

await fs.writeFile(path.join(output, "round2-single-verification.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
