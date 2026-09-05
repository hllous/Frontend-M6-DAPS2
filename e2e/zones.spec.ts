import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function openCatalog(page: import("@playwright/test").Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app");
  await page.getByRole("button", { name: "Catálogo" }).click();
}

test.describe("Zones representative states @smoke", () => {
  test("shows the success state with the deterministic fixture zones", async ({ page }) => {
    await openCatalog(page);

    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByText("Z-01")).toBeVisible();
    await expect(page.getByText("Zona Norte")).toBeVisible();
    await expect(page.getByText("Z-02")).toBeVisible();
    await expect(page.getByText("Z-03")).toBeVisible();
  });

  test("shows the empty state for a search with no matching zones", async ({ page }) => {
    // Re-issues the same request against the real BFF route with a search term the
    // deterministic fixtures never match, so the empty envelope comes from the actual
    // contract rather than a hand-authored payload.
    await page.route("**/api/zones**", async (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("search", "zzz-sin-resultados");
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });

    await openCatalog(page);

    await expect(page.getByText("Sin zonas operativas")).toBeVisible();
    await expect(page.getByText("No hay zonas registradas para mostrar.")).toBeVisible();
  });
});
