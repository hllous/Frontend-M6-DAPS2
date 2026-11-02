import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test("administra roles con teclado y mouse y pasa axe", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/access");
  await expect(page.getByText("2 (vos)")).toBeVisible();
  await page.getByLabel("Identificador de usuario M1").fill("98765");
  await page.getByLabel("Identificador de usuario M1").press("Tab");
  await page.keyboard.press("Enter");
  await page.getByRole("checkbox", { name: /Campo, inspección/ }).click();
  await page.getByRole("button", { name: "Guardar roles" }).click();
  await expect(page.getByRole("status")).toContainText("se guardaron");
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole("button", { name: "Quitar todos los roles" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar roles" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
for (const scenario of ["field-crew-leader-route", "office-limited-intake"] as const) {
  test(`${scenario} no accede`, async ({ page }) => {
    await loginViaApi(page, scenario);
    await page.goto("/app/access");
    await expect(page.getByText("Acceso no disponible")).toBeVisible();
    await expect(page.getByRole("link", { name: "Accesos" })).toHaveCount(0);
  });
}
