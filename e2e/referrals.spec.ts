import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Referral workspace", () => {
  test("Office lists both referral kinds, opens detail, and navigates to the source Service", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=referrals");

    await expect(page.getByRole("main")).toHaveCount(1);
    const list = page.getByRole("region", { name: "Lista de derivaciones" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("button", { name: /RR-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    await expect(list.getByText("Obras Públicas · Reparación")).toBeVisible();
    await expect(list.getByText("Tránsito · Corte de calle").first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await list.getByRole("button", { name: /SCR-1001/ }).click();
    const detail = page.getByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Detalle de Corte de calle · Bulevar Costero" })).toBeFocused();
    const backButton = detail.getByRole("button", { name: "Volver a derivaciones" });
    await expect.poll(async () => (await backButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
    await page.setViewportSize({ width: 760, height: 844 });
    await expect.poll(async () => (await backButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
    await page.setViewportSize({ width: 761, height: 844 });
    await expect.poll(async () => (await backButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);
    await expect(detail.getByRole("status", { name: "Estado: Solicitada" })).toBeVisible();
    await expect(detail.getByRole("link", { name: /Ver servicio/ })).toHaveAttribute(
      "href",
      /destination=services&detail=SVC-1050/,
    );
  });

  test("Field only discovers referrals attached to assigned Services", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=referrals");

    const list = page.getByRole("region", { name: "Lista de derivaciones" });
    await expect(list).toBeVisible();
    await expect(list.getByText("SVC-1050", { exact: false }).first()).toBeVisible();
    await expect(list.getByRole("button", { name: /RR-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /SCR-1001/ })).toBeVisible();

    await list.getByRole("button", { name: /RR-1001/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" })).toBeVisible();
  });

  test("keeps the workspace usable on a narrow viewport and reports an empty result", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/referrals", async (route) => {
      await route.fulfill({ json: { data: [], meta: { total: 0 } } });
    });
    await page.goto("/app?destination=referrals");
    await expect(page.getByText("Sin derivaciones")).toBeVisible();

    await page.unroute("**/api/referrals");
    await page.route("**/api/referrals", async (route) => route.abort());
    await page.reload();
    const alert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las derivaciones" });
    await expect(alert).toBeVisible();
  });
});
