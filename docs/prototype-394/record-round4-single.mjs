import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = "http://localhost:4314";
const output = path.resolve("review-394-animations");
const browser = await chromium.launch({ headless: true });

async function signIn(page) {
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

async function incrementalColumnDrag(page, sourceKey, targetKey, speed, screenshotPath) {
  const before = await columnOrder(page);
  const dataOrder = before.filter((key) => key !== "ordinal");
  const sourceIndex = dataOrder.indexOf(sourceKey);
  const targetIndex = dataOrder.indexOf(targetKey);
  assert.ok(sourceIndex >= 0 && targetIndex >= 0 && sourceIndex !== targetIndex,
    `${sourceKey} and ${targetKey} headers are visible and distinct`);
  const source = page.locator(`table[aria-label="Servicios operativos"] thead th[data-column-key="${sourceKey}"]`);
  const target = page.locator(`table[aria-label="Servicios operativos"] thead th[data-column-key="${targetKey}"]`);
  await source.evaluate((header) => {
    const table = header.closest("table");
    const scroller = table?.parentElement;
    if (!scroller) return;
    const headerBox = header.getBoundingClientRect();
    const scrollerBox = scroller.getBoundingClientRect();
    if (headerBox.left < scrollerBox.left) scroller.scrollLeft += headerBox.left - scrollerBox.left;
    if (headerBox.right > scrollerBox.right) scroller.scrollLeft += headerBox.right - scrollerBox.right;
  });
  await page.waitForTimeout(50);
  const [sourceBox, targetBox] = await Promise.all([source.boundingBox(), target.boundingBox()]);
  assert.ok(sourceBox && targetBox, "source and target headers have stable starting geometry");

  const direction = targetIndex > sourceIndex ? 1 : -1;
  const viewportWidth = page.viewportSize()?.width ?? 1440;
  const startY = sourceBox.y + sourceBox.height / 2;
  const inset = Math.min(8, sourceBox.width / 2);
  const candidateXs = direction > 0
    ? [sourceBox.x + inset, sourceBox.x + sourceBox.width * 0.3, sourceBox.x + sourceBox.width / 2,
      sourceBox.x + sourceBox.width * 0.7, sourceBox.x + sourceBox.width - inset]
    : [sourceBox.x + sourceBox.width - inset, sourceBox.x + sourceBox.width * 0.7, sourceBox.x + sourceBox.width / 2,
      sourceBox.x + sourceBox.width * 0.3, sourceBox.x + inset];
  const startX = await page.evaluate(({ xs, y, key }) => {
    for (const x of xs) {
      const element = document.elementFromPoint(x, y);
      const header = element?.closest("th[data-column-key]");
      if (header?.getAttribute("data-column-key") === key && !element?.closest('[role="slider"]')) return x;
    }
    return xs[Math.floor(xs.length / 2)];
  }, { xs: candidateXs, y: startY, key: sourceKey });
  const targetX = targetBox.x + targetBox.width / 2 + direction * 12;
  const distance = Math.abs(targetX - startX);
  const startTarget = await page.evaluate(({ x, y, sourceBox: box }) => {
    const element = document.elementFromPoint(x, y);
    const header = element?.closest("th[data-column-key]");
    return {
      tag: element?.tagName ?? null,
      role: element?.getAttribute("role") ?? null,
      key: header?.getAttribute("data-column-key") ?? null,
      pointerEvents: element ? getComputedStyle(element).pointerEvents : null,
      inert: Boolean(element?.closest("[inert]")),
      sourceBox: box,
    };
  }, { x: startX, y: startY, sourceBox });
  const stepSize = speed === "slow" ? 1 : 4;
  const stepCount = Math.max(1, Math.ceil(distance / stepSize));
  const orderAtEachStep = [before];
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= stepCount; step += 1) {
    const x = startX + (targetX - startX) * step / stepCount;
    await page.mouse.move(x, startY);
    if (speed === "slow") await page.waitForTimeout(3);
    const order = await columnOrder(page);
    orderAtEachStep.push(order);
    assert.equal(order[0], "ordinal", "# stays fixed at every drag step");
    if (screenshotPath && step === Math.ceil(stepCount / 2)) {
      await page.screenshot({ path: path.join(output, screenshotPath) });
    }
  }

  const preview = await columnOrder(page);
  const sourceIndices = orderAtEachStep.map((order) => order.indexOf(sourceKey) - 1);
  let crossedMidpoints = 0;
  for (let index = 1; index < sourceIndices.length; index += 1) {
    const change = sourceIndices[index] - sourceIndices[index - 1];
    if (direction > 0) assert.ok(change >= 0, "rightward drag never oscillates back to the left");
    else assert.ok(change <= 0, "leftward drag never oscillates back to the right");
    if (change !== 0) {
      assert.equal(Math.abs(change), 1, "each step crosses at most one column midpoint");
      crossedMidpoints += Math.abs(change);
    }
  }
  const draggingHeaderCount = await page.locator('thead th[data-column-dragging="true"]').count();
  assert.equal(sourceIndices.at(-1), targetIndex,
    `${sourceKey}->${targetKey} preview index follows the target midpoint (${JSON.stringify({
      expected: targetIndex,
      actual: sourceIndices.at(-1),
      preview,
      draggingHeaderCount,
      startTarget,
      first: orderAtEachStep[0],
      middle: orderAtEachStep[Math.floor(orderAtEachStep.length / 2)],
      last: orderAtEachStep.at(-1),
    })})`);
  assert.equal(crossedMidpoints, Math.abs(targetIndex - sourceIndex),
    "the source changes place once for every crossed column midpoint");
  assert.notDeepEqual(preview, before, "the table reorders while the pointer is still held");
  const bodyOrder = await page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').first()
    .locator("td[data-column-key]").evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-column-key")));
  assert.deepEqual(bodyOrder, preview,
    "every body cell follows the live header preview as a whole column block");
  assert.equal(await page.locator("[data-column-drag-ghost]").count(), 0, "no floating column ghost is rendered");
  await page.mouse.up();
  await page.waitForTimeout(180);
  const after = await columnOrder(page);
  assert.deepEqual(after, preview, "dropping commits exactly the last preview");
  return { sourceKey, targetKey, direction: direction > 0 ? "right" : "left", speed, before, preview, after, crossedMidpoints, orderAtEachStep };
}

async function reorderHeader(page) {
  const moves = [
    await incrementalColumnDrag(page, "service", "crew", "slow", "round4-mid-drag-1440.png"),
    await incrementalColumnDrag(page, "service", "zone", "fast"),
    await incrementalColumnDrag(page, "status", "crew", "fast"),
    await incrementalColumnDrag(page, "zone", "service", "slow"),
  ];
  const finalOrder = await columnOrder(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: path.join(output, `round4-live-drag-preview-${width}.png`) });
  return { moves, finalOrder, fixedColumn: "ordinal", screenshots: [`review-394-animations/round4-mid-drag-1440.png`, `review-394-animations/round4-live-drag-preview-${width}.png`] };
}

async function scrollResizeHandleIntoView(handle) {
  await handle.evaluate((button) => {
    const table = button.closest("table");
    const scroller = table?.parentElement;
    const marker = button.querySelector("span");
    if (!scroller || !marker) return;
    const scrollerBox = scroller.getBoundingClientRect();
    const markerBox = marker.getBoundingClientRect();
    const targetOffset = Math.min(220, Math.max(100, scrollerBox.width * 0.42));
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const targetScroll = scroller.scrollLeft + markerBox.left + markerBox.width / 2 - (scrollerBox.left + targetOffset);
    scroller.scrollLeft = Math.max(0, Math.min(maxScroll, targetScroll));
  });
}

async function incrementalResize(page, columnKey, delta, speed, screenshotPath) {
  const labels = { service: "Servicio", status: "Estado", zone: "Zona", crew: "Equipo", scheduled: "Fecha" };
  const handle = page.getByRole("slider", { name: `Ancho de columna ${labels[columnKey]}` });
  await handle.waitFor({ state: "visible" });
  await scrollResizeHandleIntoView(handle);
  await page.waitForTimeout(50);
  const header = page.locator(`table[aria-label="Servicios operativos"] thead th[data-column-key="${columnKey}"]`);
  const [headerBox, markerBox] = await Promise.all([header.boundingBox(), handle.locator("span").boundingBox()]);
  assert.ok(headerBox && markerBox, "resize edge and marker are visible");
  const startX = markerBox.x + markerBox.width / 2;
  const startY = markerBox.y + markerBox.height / 2;
  const startTarget = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    const handle = element?.closest("[data-column-resize-edge]");
    const table = element?.closest("table");
    const scroller = table?.parentElement;
    const box = (target) => {
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right };
    };
    return {
      tag: element?.tagName ?? null,
      role: element?.getAttribute("role") ?? null,
      edge: handle?.getAttribute("data-column-resize-edge") ?? null,
      pointerEvents: element ? getComputedStyle(element).pointerEvents : null,
      elementBox: box(element),
      scrollerBox: box(scroller),
      scrollLeft: scroller?.scrollLeft ?? null,
    };
  }, { x: startX, y: startY });
  const borderOffset = startX - (headerBox.x + headerBox.width);
  assert.ok(Math.abs(borderOffset) <= 2, `resize marker is centered on the column edge (offset=${borderOffset.toFixed(1)}px)`);
  const before = Number(await handle.getAttribute("aria-valuenow"));
  const stepSize = speed === "slow" ? 1 : 3;
  const stepCount = Math.max(1, Math.ceil(Math.abs(delta) / stepSize));
  const pointerLineAtEachStep = [];
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= stepCount; step += 1) {
    const pointerX = startX + delta * step / stepCount;
    await page.mouse.move(pointerX, startY);
    if (speed === "slow") await page.waitForTimeout(4);
    const line = await handle.locator("span").boundingBox();
    assert.ok(line, "resize marker remains visible during the drag");
    const lineX = line.x + line.width / 2;
    const error = lineX - pointerX;
    pointerLineAtEachStep.push({ pointerX, lineX, error });
    if (Math.abs(error) > 2) {
      const geometry = await page.evaluate((key) => {
        const table = document.querySelector('table[aria-label="Servicios operativos"]');
        const header = table?.querySelector(`thead th[data-column-key="${key}"]`);
        const ordinal = table?.querySelector('thead th[data-column-key="ordinal"]');
        const dataHeaders = Array.from(table?.querySelectorAll('thead th[data-column-key]') ?? [])
          .filter((item) => item.getAttribute("data-column-key") !== "ordinal");
        const column = table?.querySelector(`col[data-column-key="${key}"]`);
        return {
          tableWidth: table?.getBoundingClientRect().width ?? 0,
          dataHeaderWidth: dataHeaders.reduce((sum, item) => sum + item.getBoundingClientRect().width, 0),
          columnWidth: header?.getBoundingClientRect().width ?? 0,
          columnStyleWidth: column ? getComputedStyle(column).width : "",
          columnTransition: column ? getComputedStyle(column).transition : "",
          ordinalWidth: ordinal?.getBoundingClientRect().width ?? 0,
          resizing: table?.getAttribute("data-column-resizing"),
        };
      }, columnKey);
      throw new Error(`resize geometry mismatch: ${JSON.stringify({ pointerX, lineX, startX, startTarget, delta: pointerX - startX, error, width: await handle.getAttribute("aria-valuenow"), geometry })}`);
    }
    if (screenshotPath && step === Math.ceil(stepCount / 2)) {
      await page.screenshot({ path: path.join(output, screenshotPath) });
    }
  }
  const releaseX = startX + delta;
  await page.mouse.up();
  await page.waitForTimeout(100);
  const releaseLine = await handle.locator("span").boundingBox();
  assert.ok(releaseLine, "resize marker remains visible after release");
  const releaseLineX = releaseLine.x + releaseLine.width / 2;
  assert.ok(Math.abs(releaseLineX - releaseX) <= 2,
    `resize line stays at release point within 2px (error=${(releaseLineX - releaseX).toFixed(2)}px)`);
  const after = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(after, before, "dragging the column edge changes its width");
  return { columnKey, speed, delta, before, after, borderOffset, pointerLineAtEachStep, releaseX, releaseLineX };
}

async function stepwiseResizeTrace(page, columnKey, delta, screenshotPath) {
  const labels = { service: "Servicio", status: "Estado", zone: "Zona", crew: "Equipo", scheduled: "Fecha" };
  const handle = page.getByRole("slider", { name: "Ancho de columna " + labels[columnKey] });
  await handle.waitFor({ state: "visible" });
  await scrollResizeHandleIntoView(handle);
  await page.waitForTimeout(50);
  const measure = () => handle.evaluate((button) => {
    const header = button.closest("th");
    const table = button.closest("table");
    const scroller = table?.parentElement;
    const marker = button.querySelector("span");
    const headerBox = header?.getBoundingClientRect();
    const markerBox = marker?.getBoundingClientRect();
    const scrollerBox = scroller?.getBoundingClientRect();
    return {
      thRightEdge: headerBox?.right ?? null,
      markerCenter: markerBox ? markerBox.left + markerBox.width / 2 : null,
      markerLeft: markerBox?.left ?? null,
      markerWidth: markerBox?.width ?? null,
      headerLeft: headerBox?.left ?? null,
      headerWidth: headerBox?.width ?? null,
      columnWidth: Number(button.getAttribute("aria-valuenow")),
      minimumWidth: Number(button.getAttribute("aria-valuemin")),
      maximumWidth: Number(button.getAttribute("aria-valuemax")),
      tableWidth: table?.getBoundingClientRect().width ?? null,
      scrollClientWidth: scroller?.clientWidth ?? null,
      scrollWidth: scroller?.scrollWidth ?? null,
      scrollLeft: scroller?.scrollLeft ?? null,
      scrollerLeft: scrollerBox?.left ?? null,
      scrollerRight: scrollerBox?.right ?? null,
    };
  });

  const start = await measure();
  assert.ok(start.thRightEdge !== null && start.markerCenter !== null, "trace starts with measurable column and marker geometry");
  const startX = start.markerCenter;
  const startY = await handle.evaluate((button) => {
    const markerBox = button.querySelector("span")?.getBoundingClientRect();
    return markerBox ? markerBox.top + markerBox.height / 2 : null;
  });
  assert.ok(startY !== null, "trace starts at the visible resize marker");
  const startTarget = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    const handle = element?.closest("[data-column-resize-edge]");
    return {
      edge: handle?.getAttribute("data-column-resize-edge") ?? null,
      tag: element?.tagName ?? null,
      role: element?.getAttribute("role") ?? null,
      pointerEvents: element ? getComputedStyle(element).pointerEvents : null,
    };
  }, { x: startX, y: startY });
  const sign = Math.sign(delta);
  const stepCount = Math.abs(delta) / 4;
  assert.equal(Number.isInteger(stepCount), true, "trace uses exact four-pixel pointer steps");
  const expectedStartOffset = start.thRightEdge - startX;
  const violations = [];
  if (Math.abs(expectedStartOffset) > 2) {
    violations.push({ point: "start", pointerX: startX, thRightEdge: start.thRightEdge, markerCenter: start.markerCenter, error: expectedStartOffset });
  }
  if (startTarget.edge !== columnKey) {
    violations.push({ point: "pointer-target", pointerX: startX, expectedEdge: columnKey, actualEdge: startTarget.edge, startTarget });
  }
  const steps = [];
  const expectedWidthForStep = (step) => Math.max(
    start.minimumWidth,
    Math.min(start.maximumWidth, start.columnWidth + sign * 4 * step),
  );
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= stepCount; step += 1) {
    const pointerX = startX + sign * 4 * step;
    await page.mouse.move(pointerX, startY, { steps: 1 });
    await page.waitForTimeout(8);
    const current = await measure();
    const expectedWidth = expectedWidthForStep(step);
    const expectedEdge = startX + (expectedWidth - start.columnWidth);
    const edgeError = current.thRightEdge - expectedEdge;
    const markerError = current.markerCenter - current.thRightEdge;
    const widthError = current.columnWidth - expectedWidth;
    const record = {
      step,
      pointerX,
      thRightEdge: current.thRightEdge,
      markerCenter: current.markerCenter,
      columnWidth: current.columnWidth,
      expectedEdge,
      edgeError,
      markerError,
      widthError,
      tableWidth: current.tableWidth,
      scrollClientWidth: current.scrollClientWidth,
      scrollWidth: current.scrollWidth,
      scrollLeft: current.scrollLeft,
    };
    steps.push(record);
    if (Math.abs(edgeError) > 2) violations.push({ point: "step", ...record });
    if (Math.abs(markerError) > 2) violations.push({ point: "marker", ...record });
    if (Math.abs(widthError) > 1) violations.push({ point: "width", ...record });
    if (screenshotPath && step === Math.ceil(stepCount / 2)) {
      await page.screenshot({ path: path.join(output, screenshotPath) });
    }
  }
  const expectedFinalWidth = expectedWidthForStep(stepCount);
  const expectedFinalEdge = startX + (expectedFinalWidth - start.columnWidth);
  await page.mouse.up();
  await page.waitForTimeout(80);
  const release = await measure();
  const releaseEdgeError = release.thRightEdge - expectedFinalEdge;
  const releaseMarkerError = release.markerCenter - release.thRightEdge;
  if (Math.abs(releaseEdgeError) > 2) {
    violations.push({ point: "release-edge", pointerX: startX + delta, thRightEdge: release.thRightEdge,
      markerCenter: release.markerCenter, error: releaseEdgeError, columnWidth: release.columnWidth });
  }
  if (Math.abs(releaseMarkerError) > 2) {
    violations.push({ point: "release-marker", pointerX: startX + delta, thRightEdge: release.thRightEdge,
      markerCenter: release.markerCenter, error: releaseMarkerError, columnWidth: release.columnWidth });
  }
  if (release.columnWidth !== expectedFinalWidth) {
    violations.push({ point: "release-width", expectedWidth: expectedFinalWidth, actualWidth: release.columnWidth });
  }
  return {
    columnKey,
    delta,
    stepPixels: 4,
    start: { ...start, pointerX: startX },
    startTarget,
    startX,
    startY,
    requestedFinalX: startX + delta,
    expectedFinalWidth,
    expectedFinalEdge,
    release: {
      pointerX: startX + delta,
      thRightEdge: release.thRightEdge,
      markerCenter: release.markerCenter,
      columnWidth: release.columnWidth,
      tableWidth: release.tableWidth,
      scrollClientWidth: release.scrollClientWidth,
      scrollWidth: release.scrollWidth,
      scrollLeft: release.scrollLeft,
    },
    steps,
    violations,
    maxAbsEdgeError: Math.max(0, ...steps.map((item) => Math.abs(item.edgeError)), Math.abs(releaseEdgeError)),
    maxAbsMarkerError: Math.max(0, ...steps.map((item) => Math.abs(item.markerError)), Math.abs(releaseMarkerError)),
  };
}

async function traceResizeScenario(browserInstance, scenario) {
  const context = await browserInstance.newContext({ viewport: scenario.viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await signIn(page);
    if (scenario.mobile) {
      const drawer = page.getByRole("complementary", { name: "Lista de servicios" });
      await drawer.waitFor({ state: "visible" });
      assert.equal(await drawer.getAttribute("data-snap"), "half", "mobile list starts at half height");
      await drawer.getByRole("button", { name: "Expandir lista a pantalla completa" }).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Lista de servicios"]')?.getAttribute("data-snap") === "full");
      await page.screenshot({ path: path.join(output, "round4b-mobile-390.png") });
    }
    if (scenario.splitOffset) {
      const separator = page.getByRole("separator", { name: "Ajustar ancho entre mapa y tabla" });
      const box = await separator.boundingBox();
      assert.ok(box, "split handle is available for the resize trace");
      await dragElement(page, separator, { x: box.x + box.width / 2 + scenario.splitOffset, y: box.y + box.height / 2 });
      await page.waitForTimeout(550);
    }
    if (scenario.detailsOpen) {
      await page.locator('tr[data-service-id="SVC-1043"] button[data-service-select]').click();
      await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
      await page.waitForTimeout(500);
    }
    const split = await splitMetrics(page);
    const screenshot = scenario.name === "default-map-open" ? "round4b-mid-resize-1440.png" : undefined;
    const status = await stepwiseResizeTrace(page, "status", 80, screenshot);
    let horizontalScroll = null;
    if (scenario.name === "default-map-open") {
      horizontalScroll = await page.locator('table[aria-label="Servicios operativos"]').evaluate((table) => {
        const scroller = table.parentElement;
        if (!scroller) return null;
        scroller.scrollLeft = scroller.scrollWidth;
        const ordinal = table.querySelector('th[data-column-key="ordinal"]');
        const scrollerBox = scroller.getBoundingClientRect();
        const ordinalBox = ordinal?.getBoundingClientRect();
        return {
          scrollLeft: scroller.scrollLeft,
          scrollWidth: scroller.scrollWidth,
          clientWidth: scroller.clientWidth,
          ordinalPosition: ordinal ? getComputedStyle(ordinal).position : null,
          ordinalLeftOffset: ordinalBox ? ordinalBox.left - scrollerBox.left : null,
          ordinalText: ordinal?.textContent?.trim() ?? null,
        };
      });
      if (horizontalScroll && horizontalScroll.scrollLeft < 4) {
        pageErrors.push("horizontal scroll did not move the table content");
      }
      if (horizontalScroll && (horizontalScroll.ordinalPosition !== "sticky" || Math.abs(horizontalScroll.ordinalLeftOffset) > 2)) {
        pageErrors.push("the fixed # column did not remain readable during horizontal scroll");
      }
      await page.waitForTimeout(50);
      await page.screenshot({ path: path.join(output, "round4b-horizontal-scroll-1440.png") });
      await page.locator('table[aria-label="Servicios operativos"]').evaluate((table) => {
        if (table.parentElement) table.parentElement.scrollLeft = 0;
      });
    }
    const zone = await stepwiseResizeTrace(page, "zone", -60);
    return { name: scenario.name, viewport: scenario.viewport, detailsOpen: scenario.detailsOpen === true,
      splitOffset: scenario.splitOffset ?? 0, split, status, zone, horizontalScroll, pageErrors };
  } finally {
    await context.close();
  }
}

async function runResizeTraceSuite(browserInstance) {
  const scenarios = [
    { name: "default-map-open", viewport: { width: 1440, height: 900 } },
    { name: "details-open", viewport: { width: 1440, height: 900 }, detailsOpen: true },
    { name: "split-left", viewport: { width: 1440, height: 900 }, splitOffset: -120 },
    { name: "split-right", viewport: { width: 1440, height: 900 }, splitOffset: 120 },
    { name: "mobile-390", viewport: { width: 390, height: 844 }, mobile: true },
  ];
  const results = [];
  for (const scenario of scenarios) results.push(await traceResizeScenario(browserInstance, scenario));
  const violations = results.flatMap((scenario) => [
    ...scenario.status.violations.map((violation) => ({ scenario: scenario.name, columnKey: "status", ...violation })),
    ...scenario.zone.violations.map((violation) => ({ scenario: scenario.name, columnKey: "zone", ...violation })),
    ...scenario.pageErrors.map((message) => ({ scenario: scenario.name, point: "page-error", message })),
  ]);
  return {
    passed: violations.length === 0,
    scenarioCount: results.length,
    stepCount: results.reduce((sum, scenario) => sum + scenario.status.steps.length + scenario.zone.steps.length, 0),
    violations,
    scenarios: results,
    screenshots: ["review-394-animations/round4b-mid-resize-1440.png", "review-394-animations/round4b-horizontal-scroll-1440.png", "review-394-animations/round4b-mobile-390.png"],
  };
}

async function resizeColumn(page) {
  const width = page.viewportSize()?.width ?? 0;
  const grow = await incrementalResize(page, "zone", 36, "slow", `round4-mid-resize-${width}.png`);
  const shrink = await incrementalResize(page, "zone", -15, "fast");
  return { grow, shrink, viewport: width };
}

async function verifyMobileGestures(page) {
  const dataOrder = (await columnOrder(page)).filter((key) => key !== "ordinal");
  assert.ok(dataOrder.includes("service") && dataOrder.length > 1, "mobile list exposes Servicio and another movable column");
  const reorder = await moveServiceAcrossTable(page, "slow", "round4-mobile-mid-drag-390.png");
  const resize = await incrementalResize(page, "zone", 10, "slow", "round4-mid-resize-390.png");
  return { reorder, resize };
}

async function moveServiceAcrossTable(page, speed = "fast", screenshotPath) {
  const dataOrder = (await columnOrder(page)).filter((key) => key !== "ordinal");
  const serviceIndex = dataOrder.indexOf("service");
  assert.ok(serviceIndex >= 0 && dataOrder.length > 1, "Servicio and another column are visible");
  const targetKey = dataOrder[serviceIndex === 0 ? 1 : serviceIndex - 1];
  return incrementalColumnDrag(page, "service", targetKey, speed, screenshotPath);
}

async function verifyKeyboardEditing(page, includeResize = true) {
  const beforeOrder = await columnOrder(page);
  async function keyboardMove(key) {
    const header = page.locator(`table[aria-label="Servicios operativos"] thead th[data-column-key="${key}"]`);
    const before = await columnOrder(page);
    for (const direction of ["ArrowRight", "ArrowLeft"]) {
      await header.focus();
      await header.press(`Alt+${direction}`);
      const after = await columnOrder(page);
      if (JSON.stringify(after) !== JSON.stringify(before)) return { direction, after };
    }
    assert.fail(`${key} moves with Alt+Arrow in at least one direction`);
  }
  const statusMove = await keyboardMove("status");
  const afterOrder = statusMove.after;
  assert.notDeepEqual(afterOrder, beforeOrder, "Alt+Arrow reorders the focused header");
  assert.equal(afterOrder[0], "ordinal", "keyboard reorder keeps # fixed");
  const serviceMove = await keyboardMove("service");
  const afterServiceOrder = serviceMove.after;
  assert.notDeepEqual(afterServiceOrder, afterOrder, "Servicio can be moved by keyboard");
  assert.equal(afterServiceOrder[0], "ordinal", "# remains fixed when Servicio moves");

  if (!includeResize) return { beforeOrder, statusMove, afterOrder, serviceMove, afterServiceOrder, ordinalFixed: true };

  const handle = page.getByRole("slider", { name: "Ancho de columna Zona" });
  await handle.focus();
  const beforeWidth = Number(await handle.getAttribute("aria-valuenow"));
  const minimum = Number(await handle.getAttribute("aria-valuemin"));
  const maximum = Number(await handle.getAttribute("aria-valuemax"));
  const resizeKey = beforeWidth >= maximum ? "ArrowLeft" : beforeWidth <= minimum ? "ArrowRight" : "ArrowRight";
  await handle.press(resizeKey);
  const afterWidth = Number(await handle.getAttribute("aria-valuenow"));
  assert.notEqual(afterWidth, beforeWidth, "arrow keys resize a focused column edge");
  return { beforeOrder, statusMove, afterOrder, serviceMove, afterServiceOrder, beforeWidth, afterWidth, resizeKey, ordinalFixed: true };
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
    path: path.join(output, `round4-header-filter-${viewport.width}.png`),
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

async function verifyFixedRowHeight(page, { requirePaneFill = false } = {}) {
  const table = page.locator('table[aria-label="Servicios operativos"]');
  const rowMetrics = () => table.locator("tbody tr[data-service-id]").evaluateAll((rows) => rows.map((row) => ({
    id: row.getAttribute("data-service-id"),
    height: row.getBoundingClientRect().height,
  })));
  const baselineCount = await countServiceRows(page);
  const baselineRows = await rowMetrics();
  const baselineHeights = new Map(baselineRows.map((item) => [item.id, item.height]));
  const filterSpecs = [
    { label: "estado", button: "Filtrar por estado" },
    { label: "zona", button: "Filtrar por zona" },
    { label: "equipo", button: "Filtrar por equipo" },
  ];
  const appliedFilters = [];
  let filteredCount = baselineCount;

  for (const spec of filterSpecs) {
    await page.getByRole("button", { name: spec.button, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Filtro de ${spec.label}`, exact: true });
    await dialog.waitFor({ state: "visible" });
    const options = dialog.locator('label input[type="checkbox"]');
    let best = { index: -1, count: baselineCount + 1, text: "" };
    for (let index = 0; index < await options.count(); index += 1) {
      const option = options.nth(index);
      await option.check();
      const count = await countServiceRows(page);
      const text = (await option.locator("xpath=..").innerText()).trim();
      if (count > 0 && count <= 2) {
        appliedFilters.push({ ...spec, option: text });
        filteredCount = count;
        break;
      }
      if (count > 0 && count < best.count) best = { index, count, text };
      await option.uncheck();
    }
    if (filteredCount > 2 && best.index >= 0) {
      await options.nth(best.index).check();
      appliedFilters.push({ ...spec, option: best.text });
      filteredCount = await countServiceRows(page);
    }
    await page.keyboard.press("Escape");
    if (filteredCount > 0 && filteredCount <= 2) break;
  }

  assert.ok(filteredCount > 0 && filteredCount <= 2,
    `column filters leave one or two rows (count=${filteredCount})`);
  const filteredRows = await rowMetrics();
  assert.equal(filteredRows.length, filteredCount, "the filtered table contains the measured rows");
  for (const item of filteredRows) {
    const baselineHeight = baselineHeights.get(item.id);
    assert.ok(baselineHeight !== undefined, `service ${item.id} appeared in the unfiltered baseline`);
    assert.ok(Math.abs(item.height - baselineHeight) <= 1,
      `service ${item.id} keeps its own unfiltered height (${baselineHeight}px -> ${item.height}px)`);
  }
  const emptySpace = await page.evaluate(() => {
    const tableElement = document.querySelector('table[aria-label="Servicios operativos"]');
    const scrollRegion = tableElement?.parentElement;
    return scrollRegion && tableElement
      ? scrollRegion.clientHeight - tableElement.getBoundingClientRect().height
      : 0;
  });
  const width = page.viewportSize()?.width ?? 0;
  assert.ok(emptySpace >= 0, `short filtered tables do not overlap their scrolling region (${emptySpace}px)`);
  if (width > 760) assert.ok(emptySpace >= 40, `desktop short filtered tables leave blank space below (${emptySpace}px)`);
  const paneFill = await page.evaluate(() => {
    const tableElement = document.querySelector('table[aria-label="Servicios operativos"]');
    const scrollRegion = tableElement?.parentElement;
    const pane = tableElement?.closest('[aria-label="Tabla operativa de Servicios"]');
    const lastRow = tableElement?.querySelector('tbody tr[data-service-id]:last-child');
    if (!tableElement || !scrollRegion || !pane) return null;
    const scrollBox = scrollRegion.getBoundingClientRect();
    const paneBox = pane.getBoundingClientRect();
    const tableBox = tableElement.getBoundingClientRect();
    const lastRowBox = lastRow?.getBoundingClientRect();
    return {
      scrollRegionWidth: scrollBox.width,
      scrollRegionHeight: scrollBox.height,
      paneWidth: pane.clientWidth,
      paneHeight: pane.clientHeight,
      bottomGap: paneBox.bottom - scrollBox.bottom,
      background: getComputedStyle(scrollRegion).backgroundColor,
      tableBackground: getComputedStyle(tableElement).backgroundColor,
      belowLastRow: lastRowBox ? scrollBox.bottom - lastRowBox.bottom : null,
      tableBottom: tableBox.bottom,
    };
  });
  if (requirePaneFill) {
    assert.ok(paneFill, "maximized table pane metrics are available");
    assert.ok(Math.abs(paneFill.scrollRegionWidth - paneFill.paneWidth) <= 2,
      `the table scroll region fills the maximized pane width (${paneFill.scrollRegionWidth}/${paneFill.paneWidth}px)`);
    assert.ok(Math.abs(paneFill.scrollRegionHeight - paneFill.paneHeight) <= 2,
      `the table scroll region fills the maximized pane height (${paneFill.scrollRegionHeight}/${paneFill.paneHeight}px)`);
    assert.ok(Math.abs(paneFill.bottomGap) <= 2,
      `the table scroll region reaches the bottom of the maximized pane (${paneFill.bottomGap}px gap)`);
    assert.equal(paneFill.background, paneFill.tableBackground,
      "the table background continues below the fixed-height rows");
    assert.ok((paneFill.belowLastRow ?? 0) >= 40,
      `the table background extends below filtered rows (${paneFill.belowLastRow}px)`);
  }
  const screenshot = `round4-filtered-rows-${width}.png`;
  await page.screenshot({ path: path.join(output, screenshot) });

  for (const spec of appliedFilters) {
    await page.getByRole("button", { name: spec.button, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Filtro de ${spec.label}`, exact: true });
    const clear = dialog.getByRole("button", { name: "Limpiar", exact: true });
    if (await clear.count()) await clear.click();
    await page.keyboard.press("Escape");
  }
  assert.equal(await countServiceRows(page), baselineCount, "clearing the temporary filters restores all rows");
  const restoredRows = await rowMetrics();
  for (const item of restoredRows) {
    assert.ok(Math.abs(item.height - baselineHeights.get(item.id)) <= 1,
      `service ${item.id} restores its original row height after clearing filters`);
  }
  return { baselineCount, filteredCount, baselineRows, filteredRows, emptySpace, paneFill, appliedFilters, screenshot: `review-394-animations/${screenshot}` };
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
  await menu.screenshot({ path: path.join(output, `round4-categories-checked-${viewportWidth}.png`) });

  const toggled = [];
  for (const [label, key] of [["Estado", "status"], ["Zona", "zone"], ["Equipo", "crew"], ["Fecha", "scheduled"]]) {
    const item = page.getByRole("menuitemcheckbox", { name: label, exact: true });
    await item.click();
    assert.equal(await item.getAttribute("aria-checked"), "false", `${label} can be hidden`);
    assert.equal(await page.locator(`table[aria-label="Servicios operativos"] th[data-column-key="${key}"]`).count(), 0,
      `turning off ${label} hides it from the table`);
    if (label === "Zona") await menu.screenshot({ path: path.join(output, `round4-categories-unchecked-${viewportWidth}.png`) });
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
      await row.screenshot({ path: path.join(output, `round4-${name}-${state}-${width}.png`) });
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
    path: path.join(output, "round4-table-max-1440.png"),
  });
  const maximizedRowHeight = await verifyFixedRowHeight(page, { requirePaneFill: true });

  const firstPaneGestures = {
    reorder: await moveServiceAcrossTable(page, "fast"),
    resize: await incrementalResize(page, "zone", 12, "fast"),
  };
  const maxHandle = await separator.boundingBox();
  assert.ok(maxHandle, "the split handle remains available at the first pane position");
  const maxHandleCenter = maxHandle.x + maxHandle.width / 2;
  await dragElement(page, separator, {
    x: maxHandleCenter + 110,
    y: maxHandle.y + maxHandle.height / 2,
  });
  const secondPosition = await splitMetrics(page);
  assert.ok(Math.abs((secondPosition.map?.width ?? 0) - (maximized.map?.width ?? 0)) >= 80,
    "the split reaches a second distinct pane position");
  const secondPaneGestures = {
    reorder: await moveServiceAcrossTable(page, "slow"),
    resize: await incrementalResize(page, "zone", -8, "fast"),
  };
  const secondHandle = await separator.boundingBox();
  assert.ok(secondHandle, "the split handle remains available at the second pane position");
  await dragElement(page, separator, {
    x: maxHandleCenter,
    y: secondHandle.y + secondHandle.height / 2,
  });
  const restoredMaximized = await splitMetrics(page);
  assert.ok(Math.abs((restoredMaximized.map?.width ?? 0) - (maximized.map?.width ?? 0)) <= 3,
    "the first pane position is restored for the details-open walkthrough");

  const mapWidthBeforeSelect = maximized.map?.width ?? 0;
  await page.locator('tr[data-service-id="SVC-1043"] button[data-service-select]').click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
  const open = await splitMetrics(page);
  assert.ok(Math.abs((open.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "selecting a row and opening details do not reset the split");
  const openTones = await verifyTint(page, "true");
  const detailsOpenGestures = {
    reorder: await moveServiceAcrossTable(page, "slow", "round4-details-open-mid-drag-1440.png"),
    resize: await incrementalResize(page, "zone", 8, "fast", "round4-mid-resize-details-open-1440.png"),
  };
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
  await page.screenshot({ path: path.join(output, "round4-details-open-1440.png") });

  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "hidden" });
  const closed = await splitMetrics(page);
  assert.ok(Math.abs((closed.map?.width ?? 0) - mapWidthBeforeSelect) <= 2,
    "closing details does not reset the split");
  const closedTones = await verifyTint(page, "false");
  return { start, maximized, maximizedRowHeight, secondPosition, restoredMaximized, firstPaneGestures, secondPaneGestures, open, detailsOpenGestures, closed, openTones, closedTones, badgeGeometry };
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
    const rowHeight = await verifyFixedRowHeight(page);
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
    return { viewport: "1440x900", header, sorting, filters, rowHeight, search, reorder, resize, keyboard, editor, split, period, persistence, pageErrors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round4-single-desktop-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  }
}

async function verifyMobilePersistence(page, orderBeforeReload) {
  const preferenceKeys = await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("m6:services-columns:v1:")));
  assert.ok(preferenceKeys.some((key) => key.endsWith(":1")), "mobile preferences are scoped to the user");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Servicios Urbanos", exact: true }).waitFor({ timeout: 45000 });
  await page.getByRole("complementary", { name: "Lista de servicios" }).waitFor({ state: "visible" });
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
    const drawer = page.getByRole("complementary", { name: "Lista de servicios" });
    const drawerHandle = drawer.locator('button[data-inventory-map-drawer-handle="true"]');
    const map = page.locator('[aria-label="Mapa territorial de Servicios"]');
    await drawer.waitFor({ state: "visible" });
    assert.equal(await drawer.getAttribute("data-snap"), "half", "the mobile drawer starts at half height");
    assert.equal(await map.isVisible(), true, "the map remains visible beside the half-height drawer");
    await drawerHandle.click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Lista de servicios"]')?.getAttribute("data-snap") === "full");
    assert.equal(await map.isVisible(), true, "the map remains mounted under the full-height drawer");
    const rowHeight = await verifyFixedRowHeight(page);
    const gestures = await verifyMobileGestures(page);
    await page.screenshot({ path: path.join(output, "round4-mobile-full-list-390.png") });
    await drawerHandle.click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Lista de servicios"]')?.getAttribute("data-snap") === "peek");
    assert.equal(await page.getByRole("region", { name: "Tabla operativa de Servicios" }).isVisible(), false,
      "the peek snap hides list content while keeping the map visible");
    assert.equal(await map.isVisible(), true, "the map remains visible at peek height");
    await page.screenshot({ path: path.join(output, "round4-mobile-map-390.png") });
    await drawerHandle.click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Lista de servicios"]')?.getAttribute("data-snap") === "half");
    await page.getByRole("region", { name: "Tabla operativa de Servicios" }).screenshot({
      path: path.join(output, "round4-table-390.png"),
    });
    const keyboard = await verifyKeyboardEditing(page, false);
    const drawerBefore = await drawer.boundingBox();
    const selectedRow = page.locator('table[aria-label="Servicios operativos"] tbody tr[data-service-id]').first();
    const mobileSelectedId = await selectedRow.getAttribute("data-service-id");
    assert.ok(mobileSelectedId, "the mobile period shows a selectable service row");
    await selectedRow.locator("button[data-service-select]").click();
    await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "visible" });
    const openTint = await verifyTint(page, "true");
    const close = page.getByRole("button", { name: "Cerrar vista previa" });
    await close.click();
    await page.locator("aside[aria-labelledby='preview-title']").waitFor({ state: "hidden" });
    await drawer.waitFor({ state: "visible" });
    const drawerAfter = await drawer.boundingBox();
    assert.ok(drawerBefore && drawerAfter, "the mobile list drawer returns after closing the preview");
    assert.equal(await drawer.getAttribute("data-snap"), "full", "closing the preview keeps the list at full height");
    const closedTint = await verifyTint(page, "false");
    const period = await verifyPeriodInPlace(page);
    const orderBeforeReload = await columnOrder(page);
    const persistence = await verifyMobilePersistence(page, orderBeforeReload);
    await page.screenshot({ path: path.join(output, "round4-workspace-390.png") });
    assert.deepEqual(pageErrors, [], "the mobile page has no browser errors");
    return { viewport: "390x844", header, rowHeight, gestures, drawerSnaps: { half: true, full: true, peek: true }, selectedId: mobileSelectedId, keyboard, openTint, closedTint, drawerBefore, drawerAfter, period, persistence, pageErrors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "round4-single-mobile-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  }
}

await fs.mkdir(output, { recursive: true });
const traceOnly = process.argv.includes("--trace-only");
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: output, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
let result;
let failure = null;
let resizeTraces = null;
try {
  resizeTraces = await runResizeTraceSuite(browser);
  if (!resizeTraces.passed) {
    throw new Error("Resize trace failed: " + JSON.stringify(resizeTraces.violations[0]));
  }
  if (traceOnly) {
    result = {
      status: "pass",
      controls: [{ control: "Four-pixel resize traces across desktop, details, split positions, and mobile", result: "pass" }],
      resizeTraces,
      evidence: { screenshots: resizeTraces.screenshots },
    };
  } else {
  const desktop = await runDesktop(page, pageErrors);
  const mobile = await runMobile(page, pageErrors);
  const screenshots = [
    "review-394-animations/round4-mid-drag-1440.png",
    "review-394-animations/round4-mid-resize-1440.png",
    "review-394-animations/round4-details-open-mid-drag-1440.png",
    "review-394-animations/round4-mid-resize-details-open-1440.png",
    "review-394-animations/round4-filtered-rows-1440.png",
    "review-394-animations/round4-live-drag-preview-1440.png",
    "review-394-animations/round4-details-open-1440.png",
    "review-394-animations/round4-header-filter-1440.png",
    "review-394-animations/round4-categories-checked-1440.png",
    "review-394-animations/round4-categories-unchecked-1440.png",
    "review-394-animations/round4-mobile-mid-drag-390.png",
    "review-394-animations/round4-mid-resize-390.png",
    "review-394-animations/round4-filtered-rows-390.png",
    "review-394-animations/round4-workspace-390.png",
    "review-394-animations/round4-mobile-map-390.png",
  ];
  result = {
    status: "pass",
    controls: [
      { control: "Sort every sortable column ascending, descending, and clear", result: "pass", evidence: desktop.sorting },
      { control: "Open, apply, and clear every header filter with row-count changes", result: "pass", evidence: desktop.filters },
      { control: "Estado filter colors match table badges", result: "pass", evidence: desktop.filters.status.statusColors },
      { control: "Filtered rows keep their unfiltered height and maximized pane stays filled", result: "pass", evidence: { desktop: desktop.rowHeight, maximizedPane: desktop.split.maximizedRowHeight, mobile: mobile.rowHeight } },
      { control: "Categorías toggles each optional column", result: "pass", evidence: desktop.editor },
      { control: "Stepwise pointer drag crosses each midpoint once and drop matches preview", result: "pass", evidence: { desktop: desktop.reorder, mobile: mobile.gestures.reorder } },
      { control: "Keyboard reorder and column resize", result: "pass", evidence: desktop.keyboard },
      { control: "Resize line tracks the pointer within 2px at every step and release", result: "pass", evidence: { desktop: desktop.resize, mobile: mobile.gestures.resize, panePositions: [desktop.split.firstPaneGestures.resize, desktop.split.secondPaneGestures.resize], detailsOpen: desktop.split.detailsOpenGestures.resize } },
      { control: "Row selection and details open/close", result: "pass", evidence: desktop.split.badgeGeometry },
      { control: "Split handle resize and persistence", result: "pass", evidence: desktop.split },
      { control: "Periodo changes without document reload", result: "pass", evidence: desktop.period },
      { control: "Global search apply and clear", result: "pass", evidence: desktop.search },
      { control: "Subtle row tint with details open and closed", result: "pass", evidence: { open: desktop.split.openTones.unselected, closed: desktop.split.closedTones.unselected } },
      { control: "Three-snap service drawer at 390x844", result: "pass", evidence: mobile.drawerSnaps },
      { control: "Column and split preferences persist after reload", result: "pass", evidence: { desktop: desktop.persistence, mobile: mobile.persistence } },
    ],
    desktop,
    mobile,
    resizeTraces,
    pageErrors,
    evidence: { screenshots, webm: "review-394-animations/round4-single-option.webm" },
  };
  }
} catch (error) {
  failure = error;
  await page.screenshot({ path: path.join(output, "round4-single-failure.png"), fullPage: true }).catch(() => {});
  result = {
    status: "fail",
    controls: [{ control: "Walkthrough", result: "fail", detail: error instanceof Error ? error.message : String(error) }],
    resizeTraces,
    pageErrors,
    evidence: { screenshot: "review-394-animations/round4-single-failure.png" },
  };
} finally {
  const video = page.video();
  await context.close();
  try {
    if (!traceOnly) {
      const videoPath = path.join(output, "round4-single-option.webm");
      await fs.rm(videoPath, { force: true });
      await fs.rename(await video.path(), videoPath);
      if (result) result.evidence.webm = "review-394-animations/round4-single-option.webm";
    }
  } catch (error) {
    if (result) result.videoError = error instanceof Error ? error.message : String(error);
    failure ??= error;
  }
  await browser.close();
}

const resultPath = process.argv.includes("--baseline")
  ? "round4b-before-trace.json"
  : traceOnly ? "round4b-trace.json" : "round4b-verification.json";
await fs.writeFile(path.join(output, resultPath), JSON.stringify(result, null, 2));
console.log(JSON.stringify(resizeTraces?.scenarios.map((scenario) => {
  const summarize = (trace) => ({
    steps: trace.steps.length,
    maxPointerEdgeDriftPx: Number(Math.max(0, ...trace.steps.map((step) => Math.abs(step.edgeError))).toFixed(2)),
    maxMarkerOffsetPx: Number(Math.max(0, ...trace.steps.map((step) => Math.abs(step.markerError))).toFixed(2)),
    stepsOver2Px: trace.steps.filter((step) => Math.abs(step.edgeError) > 2 || Math.abs(step.markerError) > 2).length,
  });
  return {
    scenario: scenario.name,
    status: summarize(scenario.status),
    zone: summarize(scenario.zone),
  };
}) ?? [], null, 2));
if (failure) process.exitCode = 1;
