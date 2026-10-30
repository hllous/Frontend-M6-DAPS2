import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const DEMO_TICKET_ID = "550e8400-e29b-41d4-a716-446655440000";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe("public complaint tracking @smoke", () => {
  test("a resident goes from the staff login to tracking the demo code and then mistypes one", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Consultar una denuncia" }).click();

    await expect(page).toHaveURL(/\/consulta$/);
    await expect(page.getByText(/Entorno de demostración/)).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole("link", { name: /Seguir mi denuncia/ }).click();
    await expect(page).toHaveURL(/\/consulta\/denuncia$/);
    await expectNoViolations(page);

    await page.getByLabel("Código de seguimiento").fill(DEMO_TICKET_ID);
    await page.getByRole("button", { name: "Consultar" }).click();

    const result = page.getByRole("region", { name: /TK-2026-000123/ });
    await expect(result).toBeVisible();
    await expect(result).toBeFocused();
    await expect(result).toContainText("Un inspector ya visitó el lugar");
    await expect(result).toContainText("01/10/2026");
    await expectNoViolations(page);

    await page.getByLabel("Código de seguimiento").fill("123");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("Ese código no tiene el formato correcto.")).toBeVisible();
    await expect(result).toHaveCount(0);
  });

  test("a link with the code looks it up on load, also with a staff session", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto(`/consulta/denuncia?codigo=${DEMO_TICKET_ID}`);

    await expect(page).toHaveURL(/\/consulta\/denuncia/);
    await expect(page.getByRole("region", { name: /TK-2026-000123/ })).toBeVisible();
  });
});
