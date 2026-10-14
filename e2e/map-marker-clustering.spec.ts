import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test("groups inventory markers and progressively reveals numbered pins #215", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app");
  await page.getByRole("link", { name: "Mapa", exact: true }).first().click();

  await expect(page.getByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  await expect(page.getByText("CONT-002")).toBeVisible();
  await expect(page.getByText("Punto verde Plaza Mitre")).toBeVisible();
  await expect(page.getByText("Parque del Bicentenario", { exact: true })).toBeVisible();
  await expect(page.getByText("ARB-00442")).toBeVisible();

  const clusters = page.locator('[class*="markerCluster"]:visible');
  const mapPane = page.locator(".leaflet-map-pane");
  await expect(clusters.first()).toBeVisible();
  await expect(clusters.first()).toHaveAttribute("aria-label", /elementos de inventario; acercar para verlos/);

  for (let attempt = 0; attempt < 4 && await clusters.count() > 0; attempt += 1) {
    await clusters.first().click();
    await expect(mapPane).not.toHaveClass(/leaflet-zoom-anim/);
  }

  await expect.poll(async () => page.locator('[class*="markerPin"]:visible').count()).toBeGreaterThan(0);
});

test("selecting an inventory list item highlights its map marker #424", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const item = page.getByRole("button", { name: /CONT-002/ });
  await expect(item).toHaveAttribute("aria-pressed", "false");
  await item.click();

  await expect(item).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[class*="markerSelected"]').first()).toBeVisible();
});

test("keeps the mobile map visible with a keyboard and drag accessible inventory drawer #423", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const drawer = page.getByRole("complementary", { name: "Controles de la vista Inventario" });
  const map = page.locator(".leaflet-container");
  const handle = drawer.locator('[data-inventory-map-drawer-handle="true"]');

  await expect(map).toBeVisible();
  await expect(handle).toBeInViewport({ ratio: 0.95 });
  await expect(handle).toHaveAccessibleName("Mostrar lista");
  await expect(handle).toHaveAttribute("aria-expanded", "false");
  await expect(handle).toHaveCSS("min-height", "80px");
  await expect(drawer.getByRole("heading", { name: "Elementos" })).toBeVisible();

  await handle.focus();
  await page.keyboard.press("Tab");
  await expect(handle).toHaveAttribute("aria-expanded", "true");
  await expect(handle).toHaveAccessibleName("Ocultar lista");
  const firstItem = drawer.getByRole("button", { name: /CONT-002/ });
  await firstItem.focus();
  await expect(firstItem).toBeFocused();
  await expect(firstItem).toBeInViewport();

  const expandedHandle = handle;
  const expandedBox = await expandedHandle.boundingBox();
  if (!expandedBox) throw new Error("Expected the expanded drawer handle to be visible.");
  const x = expandedBox.x + expandedBox.width / 2;
  const startY = expandedBox.y + expandedBox.height / 2;
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, startY + 220, { steps: 5 });
  await page.mouse.up();
  await expect(drawer.getByRole("button", { name: "Mostrar lista" })).toHaveAttribute("aria-expanded", "false");

  await expect(map).toBeVisible();
});

test("keeps map tabs on one scrollable row and reveals the keyboard-selected tab at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const tablist = page.getByRole("tablist", { name: "Vistas del mapa operativo" });
  const lastTab = tablist.getByRole("tab", { name: "Atención hoy" });
  await expect(page.getByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  await expect(lastTab).toBeVisible();
  await expect(tablist).toHaveCSS("flex-wrap", "nowrap");
  await expect.poll(() => tablist.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  await tablist.getByRole("tab", { name: "Inventario" }).focus();
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowRight");
  await expect(lastTab).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => lastTab.evaluate((tab) => {
    const list = tab.parentElement;
    if (!list) return false;
    const tabBounds = tab.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    return tabBounds.left >= listBounds.left - 1 && tabBounds.right <= listBounds.right + 1;
  })).toBe(true);
});

test("keeps the map box height constant across tabs on desktop and mobile #423", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

    const mapPanel = page.locator("div[class*='mapPanel']");
    await expect(mapPanel).toBeVisible();
    const heights: number[] = [];

    for (const label of ["Inventario", "Zonas", "Cobertura", "Recorrido"]) {
      const tab = page.getByRole("tab", { name: label });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      const listArea = label === "Inventario"
        ? page.locator("section[class*='visibleList'] ul")
        : page.locator("section[class*='viewPanel']");
      await expect.poll(() => listArea.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
      const box = await mapPanel.boundingBox();
      if (!box) throw new Error(`Expected the map panel to be visible for ${label}.`);
      heights.push(box.height);
    }

    expect(
      Math.max(...heights) - Math.min(...heights),
      `map panel heights at ${viewport.width}px: ${heights.join(", ")}`,
    ).toBeLessThan(1);
  }
});

test("keeps the mobile refresh action compact and keyboard accessible #423", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const refresh = page.getByRole("button", { name: "Actualizar datos" });
  await expect(refresh).toBeVisible();
  await expect(refresh).toBeEnabled();
  const box = await refresh.boundingBox();
  if (!box) throw new Error("Expected the refresh control to have a visible target.");
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeLessThanOrEqual(64);

  await refresh.focus();
  await expect(refresh).toBeFocused();
  await expect.poll(() => refresh.evaluate((button) => getComputedStyle(button).outlineStyle)).toBe("solid");
  await expect.poll(() => refresh.evaluate((button) => getComputedStyle(button).outlineWidth)).toBe("3px");
  await refresh.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Actualizar datos");
});
