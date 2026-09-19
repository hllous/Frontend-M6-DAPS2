import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test("groups inventory markers and progressively reveals numbered pins #215", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app");
  await page.getByRole("button", { name: "Mapa", exact: true }).first().click();

  await expect(page.getByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  await expect(page.getByText("CONT-002")).toBeVisible();
  await expect(page.getByText("Punto verde Plaza Mitre")).toBeVisible();
  await expect(page.getByText("Parque del Bicentenario", { exact: true })).toBeVisible();
  await expect(page.getByText("ARB-00442")).toBeVisible();

  const clusters = page.locator('[class*="markerCluster"]:visible');
  await expect(clusters.first()).toBeVisible();
  await expect(clusters.first()).toHaveAttribute("aria-label", /servicios; acercar para verlos/);

  for (let attempt = 0; attempt < 4 && await clusters.count() > 0; attempt += 1) {
    await clusters.first().click();
    await page.waitForTimeout(600);
  }

  await expect.poll(async () => page.locator('[class*="markerPin"]:visible').count()).toBeGreaterThan(0);
});
