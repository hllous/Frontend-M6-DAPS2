import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test("las pantallas de datos aprovechan el ancho disponible hasta 1800 px", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  for (const width of [1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app?destination=map");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading").first()).toBeVisible();
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(width === 1920 ? 1600 : 1799);
    expect(box!.width).toBeLessThanOrEqual(1800);
  }
});
