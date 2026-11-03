import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// #708, #709, #720: comunas con borde, barrios de color y visibilidad que también filtra los marcadores.
test("hiding all communes and barrios, then showing one barrio, filters the inventory markers #720", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=map", { waitUntil: "domcontentloaded" });

  const markers = page.locator(".leaflet-marker-icon[title]");
  await expect(page.getByRole("button", { name: "Comunas y barrios" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".leaflet-pane.leaflet-barrios-pane path")).not.toHaveCount(0);
  await expect(page.locator(".leaflet-pane.leaflet-comunas-pane path")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Comunas y barrios" }).click();
  await page.getByRole("button", { name: "Ocultar todos" }).click();
  await expect(page.locator(".leaflet-pane.leaflet-barrios-pane path")).toHaveCount(0);
  await expect(markers).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Palermo", exact: true }).click();
  await expect(page.locator(".leaflet-pane.leaflet-barrios-pane path")).not.toHaveCount(0);

  await page.getByRole("button", { name: "Mostrar todos" }).click();
  await expect(page.locator(".leaflet-pane.leaflet-comunas-pane path")).not.toHaveCount(0);
});
