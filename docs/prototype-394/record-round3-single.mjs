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
  const target = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="crew"]');
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert.ok(sourceBox && targetBox, "source and target headers are visible");

  await page.mouse.move(sourceBox.x + 1, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 19, sourceBox.y + sourceBox.height / 2, { steps: 3 });
  await page.mouse.move(targetBox.x + 4, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.waitForFunction(() => {
    const headers = [...document.querySelectorAll('table[aria-label="Servicios operativos"] thead th[data-column-key]')];
    return headers.findIndex((header) => header.getAttribute("data-column-key") === "zone") >
      headers.findIndex((header) => header.getAttribute("data-column-key") === "crew");
  }, undefined, { timeout: 10000 });
  const preview = await columnOrder(page);
  assert.notDeepEqual(preview, before, "the table reorders while the pointer is still held");
  assert.deepEqual(preview.slice(0, 2), ["ordinal", "service"], "# and Servicio stay fixed during a drag");
  const bodyOrder = await page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').first()
    .locator("td[data-column-key]").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-column-key")));
  assert.deepEqual(bodyOrder, preview,
    "every body cell follows the live header preview as a whole column block");
  assert.equal(await page.locator("[data-column-drag-ghost]").count(), 0, "no floating column ghost is rendered");
  await page.screenshot({ path: path.join(output, "round3-live-drag-preview-1440.png") });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await columnOrder(page);
  assert.deepEqual(after, preview, "dropping commits the previewed column order");
  return { before, preview, after, floatingGhosts: 0, screenshot: "review-394-animations/round3-live-drag-preview-1440.png" };
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
  await header.screenshot({ path: path.join(output, `round3-resize-marker-${width}.png`) });
  await dragElement(page, handle, {
    x: handleBox.x + handleBox.width / 2 + 44,
    y: handleBox.y + handleBox.height / 2,
  });
  const after = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(after, before, "dragging the column edge changes its width");
  return { before, after, verticalOffset, borderOffset };
}

async function verifyKeyboardEditing(page, includeResize = true) {
  const beforeOrder = await columnOrder(page);
  const statusHeader = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="status"]');
  await statusHeader.focus();
  await statusHeader.press("Alt+ArrowRight");
  const afterOrder = await columnOrder(page);
  assert.notDeepEqual(afterOrder, beforeOrder, "Alt+Arrow reorders the focused header");
  assert.deepEqual(afterOrder.slice(0, 2), ["ordinal", "service"], "keyboard reorder keeps # and Servicio fixed");
  const serviceHeader = page.locator('table[aria-label="Servicios operativos"] thead th[data-column-key="service"]');
  await serviceHeader.focus();
  await serviceHeader.press("Alt+ArrowRight");
  assert.deepEqual(await columnOrder(page), afterOrder, "Servicio cannot be moved by keyboard");

  if (!includeResize) return { beforeOrder, afterOrder, fixedColumnsLocked: true };

  const handle = page.getByRole("slider", { name: "Ancho de columna Zona" });
  await handle.focus();
  const beforeWidth = Number(await handle.getAttribute("aria-valuenow"));
  const minimum = Number(await handle.getAttribute("aria-valuemin"));
  const maximum = Number(await handle.getAttribute("aria-valuemax"));
  const resizeKey = beforeWidth >= maximum ? "ArrowLeft" : beforeWidth <= minimum ? "ArrowRight" : "ArrowRight";
  await handle.press(resizeKey);
  const afterWidth = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(afterWidth, beforeWidth, "arrow keys resize a focused column edge");
  return { beforeOrder, afterOrder, beforeWidth, afterWidth, resizeKey };
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
    path: path.join(output, `round3-header-filter-${viewport.width}.png`),
    clip: { x, y, width: viewport.width - x, height: bottom - y },
  });
  return { toolbarText, headingCount: 1, searchCount: 1 };
}

async function serviceRowOrder(page) {
  return page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-service-id")));
}

async function clearActiveSort(page) {
  const table = page.locator('table[aria-label="Servicios operativos"]');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const activeHeader = table.locator('thead th[aria-sort="ascending"], thead th[aria-sort="descending"]');
    if (await activeHeader.count() === 0) return;
    await activeHeader.first().locator('button[aria-label^="Ordenar por"]').first().click();
  }
  assert.equal(await table.locator('thead th[aria-sort="ascending"], thead th[aria-sort="descending"]').count(), 0,
    "sorting can be cleared from its header");
}

async function verifySorting(page) {
  const results = {};
  for (const key of ["service", "status", "zone", "crew", "scheduled"]) {
    await clearActiveSort(page);
    const baseline = await serviceRowOrder(page);
    const header = page.locator(`table[aria-label="Servicios operativos"] thead th[data-column-key="${key}"]`);
    const button = header.locator('button[aria-label^="Ordenar por"]').first();
    await button.click();
    await page.waitForFunction((column) =>
      document.querySelector(`table[aria-label="Servicios operativos"] thead th[data-column-key="${column}"]`)?.getAttribute("aria-sort") === "ascending", key);
    const ascending = await serviceRowOrder(page);
    await button.click();
    await page.waitForFunction((column) =>
      document.querySelector(`table[aria-label="Servicios operativos"] thead th[data-column-key="${column}"]`)?.getAttribute("aria-sort") === "descending", key);
    const descending = await serviceRowOrder(page);
    await button.click();
    await page.waitForFunction((column) =>
      document.querySelector(`table[aria-label="Servicios operativos"] thead th[data-column-key="${column}"]`)?.getAttribute("aria-sort") === "none", key);
    const cleared = await serviceRowOrder(page);
    assert.notDeepEqual(ascending, descending, `${key} ascending and descending produce different row orders`);
    assert.notDeepEqual(descending, cleared, `${key} clear restores a different row order`);
    assert.deepEqual(cleared, baseline, `${key} clear restores the unsorted row order`);
    results[key] = { ascending, descending, cleared, baselineRestored: true };
  }
  return results;
}

async function countServiceRows(page) {
  return page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').count();
}

async function verifyCheckboxHeaderFilter(page, label, buttonName, colorCheck = false) {
  const before = await countServiceRows(page);
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Filtro de ${label}`, exact: true });
  await dialog.waitFor({ state: "visible" });

  let statusColors = [];
  if (colorCheck) {
    const options = dialog.locator("[data-status-filter-option]");
    statusColors = await options.evaluateAll((elements) => elements.map((option) => {
      const status = option.getAttribute("data-status-filter-option");
      const filterBadge = option.querySelector("[data-status]");
      const tableBadge = document.querySelector(`tbody [data-status="${status}"]`);
      if (!filterBadge || !tableBadge) return { status, compared: false };
      const colors = (element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color, border: style.borderTopColor };
      };
      return { status, compared: true, filter: colors(filterBadge), table: colors(tableBadge) };
    }));
    for (const color of statusColors.filter((item) => item.compared)) {
      assert.deepEqual(color.filter, color.table, `${color.status} filter chip uses the same colors as its table badge`);
    }
    assert.ok(statusColors.some((item) => item.compared), "status filter colors are compared with visible table badges");
  }

  const options = dialog.locator('label input[type="checkbox"]');
  let applied = null;
  for (let index = 0; index < await options.count(); index += 1) {
    const option = options.nth(index);
    await option.check();
    const count = await countServiceRows(page);
    if (count < before) {
      applied = { option: await option.locator("xpath=..").innerText(), count };
      break;
    }
    await option.uncheck();
  }
  assert.ok(applied, `${label} filter can be applied and changes the row count`);
  assert.ok(applied.count < before, `${label} filter narrows the service list`);
  await dialog.getByRole("button", { name: "Limpiar", exact: true }).click();
  assert.equal(await countServiceRows(page), before, `${label} filter can be cleared and restores the row count`);
  await page.keyboard.press("Escape");
  return { opened: true, applied, clearedCount: before, statusColors };
}

async function verifyScheduleHeaderFilter(page) {
  const before = await countServiceRows(page);
  await page.getByRole("button", { name: "Filtrar por horario", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filtro de horario", exact: true });
  await dialog.waitFor({ state: "visible" });
  const [from, to] = await dialog.locator('input[type="time"]').all();
  assert.ok(from && to, "the schedule filter has Desde and Hasta controls");
  let applied = null;
  for (const [start, end] of [["00:00", "00:15"], ["23:30", "23:59"], ["08:00", "08:30"]]) {
    await from.fill(start);
    await to.fill(end);
    const count = await countServiceRows(page);
    if (count < before) {
      applied = { from: start, to: end, count };
      break;
    }
  }
  assert.ok(applied, "the schedule filter can be applied and changes the row count");
  await dialog.getByRole("button", { name: "Limpiar", exact: true }).click();
  assert.equal(await countServiceRows(page), before, "the schedule filter can be cleared and restores the row count");
  await page.keyboard.press("Escape");
  return { opened: true, applied, clearedCount: before };
}

async function verifyHeaderFilters(page) {
  const zone = await verifyCheckboxHeaderFilter(page, "zona", "Filtrar por zona");
  const status = await verifyCheckboxHeaderFilter(page, "estado", "Filtrar por estado", true);
  const crew = await verifyCheckboxHeaderFilter(page, "equipo", "Filtrar por equipo");
  const schedule = await verifyScheduleHeaderFilter(page);
  return { zone, status, crew, schedule };
}

async function verifySearch(page) {
  const input = page.getByLabel("Buscar servicios por texto libre");
  const before = await countServiceRows(page);
  await input.fill("Recorrido 4");
  await page.waitForFunction((previousCount) =>
    document.querySelectorAll('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').length < previousCount, before);
  const filtered = await countServiceRows(page);
  assert.ok(filtered > 0 && filtered < before, "search filters the service rows");
  await page.getByRole("button", { name: "Borrar búsqueda", exact: true }).click();
  assert.equal(await countServiceRows(page), before, "search can be cleared and restores the row count");
  return { query: "Recorrido 4", before, filtered, cleared: await countServiceRows(page) };
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
  await menu.screenshot({ path: path.join(output, `round3-categories-checked-${viewportWidth}.png`) });

  const toggled = [];
  for (const [label, key] of [["Estado", "status"], ["Zona", "zone"], ["Equipo", "crew"], ["Fecha", "scheduled"]]) {
    const item = page.getByRole("menuitemcheckbox", { name: label, exact: true });
    await item.click();
    assert.equal(await item.getAttribute("aria-checked"), "false", `${label} can be hidden`);
    assert.equal(await page.locator(`table[aria-label="Servicios operativos"] th[data-column-key="${key}"]`).count(), 0,
      `turning off ${label} hides it from the table`);
    if (label === "Zona") await menu.screenshot({ path: path.join(output, `round3-categories-unchecked-${viewportWidth}.png`) });
    await item.click();
    assert.equal(await item.getAttribute("aria-checked"), "true", `${label} can be restored`);
    assert.equal(await page.locator(`table[aria-label="Servicios operativos"] th[data-column-key="${key}"]`).count(), 1,
      `turning on ${label} shows it again`);
    toggled.push(label);
  }

  const zone = page.getByRole("menuitemcheckbox", { name: "Zona", exact: true });
  await zone.focus();
  await zone.press("Space");
  assert.equal(await zone.getAttribute("aria-checked"), "false", "Space hides Zona through the keyboard");
  await zone.press("Space");
  assert.equal(await zone.getAttribute("aria-checked"), "true", "Space restores Zona through the keyboard");
  const crew = page.getByRole("menuitemcheckbox", { name: "Equipo", exact: true });
  await crew.click();
  assert.equal(await crew.getAttribute("aria-checked"), "false", "Equipo remains hidden for the reload check");
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="crew"]').count(), 0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  return { visibleChoices: ["Estado", "Zona", "Equipo", "Fecha"], toggled, fixedColumnsLocked: true };
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
      const surfaceChannels = normalSurface.match(/[\d.]+/g)?.slice(0, 3).map((channel) => Number(channel) / 255) ?? [];
      return {
        backgroundColor: color,
        filter: style.filter,
        opacity: style.opacity,
        isNormal: color === normalSurface,
        isLightTint: rgb.length === 3 && rgb.every((channel) => channel >= 0.93 && channel < 1),
        tintStrength: rgb.length === 3 && surfaceChannels.length === 3
          ? rgb.reduce((total, channel, index) => total + Math.abs(channel - surfaceChannels[index]), 0) / 3
          : 0,
      };
    };
    return { selected: read(selected), unselected: read(unselected), normalSurface };
  });
  assert.ok(tones.unselected, "at least one non-selected service row is visible");
  assert.equal(tones.unselected.filter, "none");
  assert.equal(tones.unselected.opacity, "1");
  assert.equal(tones.unselected.isLightTint, true, "non-selected rows have a subtle light-gray tint");
  assert.ok(tones.unselected.tintStrength >= 0.028 && tones.unselected.tintStrength <= 0.1,
    `non-selected rows have a subtle but visible tint (${tones.unselected.tintStrength})`);
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
      await row.screenshot({ path: path.join(output, `round3-${name}-${state}-${width}.png`) });
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
    path: path.join(output, "round3-table-max-1440.png"),
  });

  const mapWidthBeforeSelect = maximized.map?.width ?? 0;
  await page.locator('tr[data-service-id="SVC-1043"] button[data-service-select]').click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
  const open = await splitMetrics(page);
  assert.ok(Math.abs((open.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "selecting a row and opening details do not reset the split");
  const openTones = await verifyTint(page, "true");
  const selectedBadge = page.locator('tr[data-service-id="SVC-1043"] td[data-column-key="status"] [data-status]');
  const badgeGeometry = await selectedBadge.evaluate((badge) => {
    const label = badge.querySelector("span");
    return {
      text: label?.textContent?.trim() ?? "",
      whiteSpace: label ? getComputedStyle(label).whiteSpace : "",
      badgeWidth: badge.clientWidth,
      badgeScrollWidth: badge.scrollWidth,
      labelWidth: label?.clientWidth ?? 0,
      labelScrollWidth: label?.scrollWidth ?? 0,
    };
  });
  assert.equal(badgeGeometry.text, "Programado", "the selected Estado badge shows its full label with details open");
  assert.equal(badgeGeometry.whiteSpace, "nowrap", "the Estado badge label cannot wrap or truncate");
  assert.ok(badgeGeometry.badgeScrollWidth <= badgeGeometry.badgeWidth + 1);
  assert.ok(badgeGeometry.labelScrollWidth <= badgeGeometry.labelWidth + 1);
  await page.screenshot({ path: path.join(output, "round3-details-open-1440.png") });

  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "hidden" });
  const closed = await splitMetrics(page);
  assert.ok(Math.abs((closed.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "closing details does not reset the split");
  const closedTones = await verifyTint(page, "false");
  return { start, maximized, open, closed, openTones, closedTones, badgeGeometry };
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
  await select.selectOption(before);
  await page.waitForTimeout(450);
  assert.equal(await select.inputValue(), before, "the walkthrough restores the original period for later controls");
  await page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').first()
    .waitFor({ state: "visible", timeout: 15000 });
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

async function runDesktop(page, pageErrors) {
  try {
    await signIn(page);
    assert.equal(await page.locator("[data-column-editor]").getAttribute("data-column-editor"), "1");
    const header = await inspectHeaderAndFilters(page);
    const sorting = await verifySorting(page);
    const filters = await verifyHeaderFilters(page);
    const search = await verifySearch(page);
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
    return { viewport: "1440x900", header, sorting, filters, search, reorder, resize, keyboard, editor, split, period, persistence, pageErrors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round3-single-desktop-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  }
}

async function verifyMobilePersistence(page, orderBeforeReload) {
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
  assert.equal(await page.locator('table[aria-label="Servicios operativos"] th[data-column-key="crew"]').count(), 0,
    "mobile column visibility persists after reload");
  return { preferenceKeys, reloadedOrder };
}

async function runMobile(page, pageErrors) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  try {
    const header = await inspectHeaderAndFilters(page);
    const listTab = page.getByRole("button", { name: "Lista", exact: true });
    const mapTab = page.getByRole("button", { name: "Mapa", exact: true });
    await listTab.click();
    assert.equal(await listTab.getAttribute("aria-pressed"), "true", "Lista opens the mobile list");
    await page.screenshot({ path: path.join(output, "round3-mobile-list-390.png") });
    await mapTab.click();
    assert.equal(await mapTab.getAttribute("aria-pressed"), "true", "Mapa opens the mobile map");
    assert.equal(await listTab.getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator('[aria-label="Mapa territorial de Servicios"]').isVisible(), true);
    await page.screenshot({ path: path.join(output, "round3-mobile-map-390.png") });
    await listTab.click();
    assert.equal(await listTab.getAttribute("aria-pressed"), "true", "Lista returns from Mapa");
    await page.getByRole("region", { name: "Tabla operativa de Servicios" }).screenshot({
      path: path.join(output, "round3-table-390.png"),
    });
    const keyboard = await verifyKeyboardEditing(page, false);
    const drawer = page.locator('[aria-label="Lista de servicios"]');
    const drawerBefore = await drawer.boundingBox();
    const selectedRow = page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').first();
    const mobileSelectedId = await selectedRow.getAttribute("data-service-id");
    assert.ok(mobileSelectedId, "the mobile period shows a selectable service row");
    await selectedRow.locator("button[data-service-select]").click();
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
    const persistence = await verifyMobilePersistence(page, orderBeforeReload);
    await page.screenshot({ path: path.join(output, "round3-workspace-390.png") });
    assert.deepEqual(pageErrors, [], "the mobile page has no browser errors");
    return { viewport: "390x844", header, mobileTabs: { list: true, map: true }, selectedId: mobileSelectedId, keyboard, openTint, closedTint, drawerBefore, drawerAfter, period, persistence, pageErrors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round3-single-mobile-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  }
}

await fs.mkdir(output, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: output, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
let result;
let failure = null;
try {
  const desktop = await runDesktop(page, pageErrors);
  const mobile = await runMobile(page, pageErrors);
  const screenshots = [
    "review-394-animations/round3-live-drag-preview-1440.png",
    "review-394-animations/round3-details-open-1440.png",
    "review-394-animations/round3-header-filter-1440.png",
    "review-394-animations/round3-categories-checked-1440.png",
    "review-394-animations/round3-categories-unchecked-1440.png",
    "review-394-animations/round3-workspace-390.png",
    "review-394-animations/round3-mobile-map-390.png",
  ];
  result = {
    status: "pass",
    controls: [
      { control: "Sort every sortable column ascending, descending, and clear", result: "pass", evidence: desktop.sorting },
      { control: "Open, apply, and clear every header filter with row-count changes", result: "pass", evidence: desktop.filters },
      { control: "Estado filter colors match table badges", result: "pass", evidence: desktop.filters.status.statusColors },
      { control: "Categorías toggles each optional column", result: "pass", evidence: desktop.editor },
      { control: "Pointer drag live preview and fixed columns", result: "pass", evidence: desktop.reorder },
      { control: "Keyboard reorder and column resize", result: "pass", evidence: desktop.keyboard },
      { control: "Pointer resize", result: "pass", evidence: desktop.resize },
      { control: "Row selection and details open/close", result: "pass", evidence: desktop.split.badgeGeometry },
      { control: "Split handle resize and persistence", result: "pass", evidence: desktop.split },
      { control: "Periodo changes without document reload", result: "pass", evidence: desktop.period },
      { control: "Global search apply and clear", result: "pass", evidence: desktop.search },
      { control: "Subtle row tint with details open and closed", result: "pass", evidence: { open: desktop.split.openTones.unselected, closed: desktop.split.closedTones.unselected } },
      { control: "Mobile Lista and Mapa at 390x844", result: "pass", evidence: mobile.mobileTabs },
      { control: "Column and split preferences persist after reload", result: "pass", evidence: { desktop: desktop.persistence, mobile: mobile.persistence } },
    ],
    desktop,
    mobile,
    pageErrors,
    evidence: { screenshots, webm: "review-394-animations/round3-single-option.webm" },
  };
} catch (error) {
  failure = error;
  await page.screenshot({ path: path.join(output, "round3-single-failure.png"), fullPage: true }).catch(() => {});
  result = {
    status: "fail",
    controls: [{ control: "Walkthrough", result: "fail", detail: error instanceof Error ? error.message : String(error) }],
    pageErrors,
    evidence: { screenshot: "review-394-animations/round3-single-failure.png" },
  };
} finally {
  const video = page.video();
  await context.close();
  try {
    const videoPath = path.join(output, "round3-single-option.webm");
    await fs.rm(videoPath, { force: true });
    await fs.rename(await video.path(), videoPath);
    if (result) result.evidence.webm = "review-394-animations/round3-single-option.webm";
  } catch (error) {
    if (result) result.videoError = error instanceof Error ? error.message : String(error);
    failure ??= error;
  }
  await browser.close();
}

await fs.writeFile(path.join(output, "round3-single-verification.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (failure) process.exitCode = 1;
