import { expect, test, type Locator } from "@playwright/test";

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

test("keeps the mobile map visible with a keyboard accessible inventory drawer #423", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const drawer = page.getByRole("complementary", { name: "Controles de la vista Inventario" });
  const map = page.locator(".leaflet-container");
  const trigger = drawer.getByRole("button", { name: "Mostrar lista" });

  await expect(map).toBeVisible();
  await expect(trigger).toBeInViewport({ ratio: 0.95 });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const content = page.getByRole("dialog", { name: "Elementos" });
  await expect(content).toBeVisible();
  await expect(content).not.toHaveAttribute("aria-modal", "true");
  const firstItem = content.getByRole("button", { name: /CONT-002/ });
  await expect(firstItem).toBeVisible();
  await expect(map).toBeVisible();

  await content.getByRole("button", { name: "Cerrar lista" }).click();
  await expect(content).not.toBeVisible();
  await expect(trigger).toBeFocused();

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
      let listArea: Locator;
      let inventoryDialog: Locator | undefined;
      if (label === "Inventario" && viewport.width <= 760) {
        await page.getByRole("button", { name: "Mostrar lista" }).click();
        inventoryDialog = page.getByRole("dialog", { name: "Elementos" });
        await expect(inventoryDialog).toBeVisible();
        listArea = inventoryDialog.getByRole("list", { name: "Elementos visibles" });
      } else {
        listArea = label === "Inventario"
          ? page.getByRole("list", { name: "Elementos visibles" })
          : page.locator("section[class*='viewPanel']");
      }
      await expect.poll(() => listArea.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
      const box = await mapPanel.boundingBox();
      if (!box) throw new Error(`Expected the map panel to be visible for ${label}.`);
      heights.push(box.height);
      if (inventoryDialog) await inventoryDialog.getByRole("button", { name: "Cerrar lista" }).click();
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

test("keeps mobile navigation usable while the inventory drawer is open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const drawer = page.getByRole("complementary", { name: "Controles de la vista Inventario" });
  await drawer.getByRole("button", { name: "Mostrar lista" }).click();
  const panel = page.getByRole("dialog", { name: "Elementos" });
  await expect(panel).toBeVisible();

  const mobileNavigation = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect.poll(async () => panel.evaluate((element) => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Navegación móvil"]');
    return navigation !== null && element.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().top + 1;
  })).toBe(true);
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element, "::after").backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await mobileNavigation.getByRole("link", { name: "Servicios", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
});
