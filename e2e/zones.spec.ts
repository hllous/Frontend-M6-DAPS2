import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Catalog landing #844", () => {
  test("shows only the catalog cards and keeps the zones catalog reachable", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    const zoneRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/zones") zoneRequests.push(request.url());
    });
    await page.goto("/app?destination=catalog");

    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(page.locator("main li")).toHaveCount(12);
    await expect(page.getByRole("heading", { name: "Zonas operativas", level: 2 })).toHaveCount(0);
    await expect(page.getByText("Belgrano", { exact: true })).toHaveCount(0);
    expect(zoneRequests).toHaveLength(0);

    await page.getByRole("link", { name: "Abrir Zonas operativas" }).click();
    await expect(page).toHaveURL(/\/app\/catalog\/zones$/);
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Belgrano" }).first()).toBeVisible();
  });
});
