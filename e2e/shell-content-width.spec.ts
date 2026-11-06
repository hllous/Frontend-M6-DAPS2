import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

const dataRoutes = ["/app?destination=services", "/app?destination=map", "/app?destination=referrals", "/app?destination=environment", "/app?destination=dashboards", "/app/catalog/containers", "/app/admin/integration-monitor"];
const readingRoutes = ["/app?destination=work", "/app/access"];

test("el shell asigna ancho según la pantalla y respeta el límite", async ({ page }) => {
  test.setTimeout(120000);
  await loginViaApi(page, "office-duty-queue");
  for (const width of [1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [...dataRoutes, ...readingRoutes]) {
      await page.goto(route);
      const main = page.getByRole("main");
      await expect(main.getByRole("heading").first()).toBeVisible();
      if (route === "/app?destination=referrals") {
        const list = main.getByRole("region", { name: "Lista de derivaciones" });
        await expect(list).toBeVisible();
        expect((await list.boundingBox())!.width).toBeGreaterThan(1500);
      }
      const box = await main.boundingBox();
      expect(box).not.toBeNull();
      if (dataRoutes.includes(route)) {
        expect(box!.width, route).toBeGreaterThan(width === 1920 ? 1600 : 1799);
        expect(box!.width, route).toBeLessThanOrEqual(1800);
      } else {
        expect(box!.width, route).toBe(1440);
      }
    }
  }
});

test("el shell no desborda horizontalmente en laptop ni móvil", async ({ page }) => {
  test.setTimeout(120000);
  await loginViaApi(page, "office-duty-queue");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [...dataRoutes, ...readingRoutes]) {
      await page.goto(route);
      await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} a ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});
