import { expect, test, type Page } from "@playwright/test";

// Real components on the dev-only fixture route (src/app/prototype/ui-components).
const evidenceDir = process.env.EVIDENCE_DIR;
const section = (page: Page) => page.getByTestId("ui-field-inputs");

test.describe("shadcn Field, Label, Input and Textarea", () => {
  for (const { name, width, height, control, text } of [
    { name: "desktop", width: 1440, height: 900, control: 40, text: "14px" },
    { name: "mobile", width: 390, height: 844, control: 48, text: "16px" },
  ]) {
    test(`sizes and tokens at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/prototype/ui-components");

      const box = (id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().height);
      expect(await box("fx-name")).toBe(control);
      expect(await box("fx-email")).toBe(control);
      expect(await box("fx-solo")).toBe(control);
      expect(await box("fx-notes")).toBeGreaterThanOrEqual(96);

      const style = (id: string, prop: "fontSize" | "borderTopColor") =>
        page.locator(`#${id}`).evaluate((el, p) => getComputedStyle(el)[p], prop);
      expect(await style("fx-name", "fontSize")).toBe(text);
      expect(await style("fx-notes", "fontSize")).toBe(text);
      expect(await style("fx-name", "borderTopColor")).toBe("rgb(112, 132, 154)");
      expect(await style("fx-email", "borderTopColor")).toBe("rgb(159, 47, 39)");

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      if (evidenceDir) {
        await page.screenshot({ path: `${evidenceDir}/field-inputs-${width}x${height}.png` });
      }
    });
  }

  test("Tab moves through the controls in order and shows the focus ring", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    await section(page).locator("#fx-name").focus();
    await page.keyboard.type("Ana");
    await expect(page.locator("#fx-name")).toHaveValue("Ana");
    // transition-colors animates the outline colour, so poll until it settles.
    await expect
      .poll(() =>
        page.locator("#fx-name").evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.outlineColor];
        }),
      )
      .toEqual(["solid", "3px", "2px", "rgb(35, 119, 189)"]);

    for (const id of ["fx-email", "fx-notes", "fx-solo"]) {
      await page.keyboard.press("Tab");
      await expect(page.locator(`#${id}`)).toBeFocused();
    }

    await page.locator("#fx-notes").focus();
    await page.keyboard.type("a");
    await page.keyboard.press("Enter");
    await page.keyboard.type("b");
    await expect(page.locator("#fx-notes")).toHaveValue("a\nb");
  });

  test("clicking a label focuses its control", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    for (const [label, id] of [
      ["Nombre", "fx-name"],
      ["Notas", "fx-notes"],
      ["Etiqueta suelta", "fx-solo"],
    ]) {
      await section(page).getByText(label, { exact: true }).click();
      await expect(page.locator(`#${id}`)).toBeFocused();
      await expect(section(page).getByRole("textbox", { name: label })).toBeVisible();
    }
  });

  test("description and error are associated with their controls", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    await expect(section(page).getByRole("textbox", { name: "Nombre" })).toHaveAccessibleDescription("Como figura en el padrón");

    const email = section(page).getByRole("textbox", { name: "Correo" });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleErrorMessage("El correo es obligatorio");
    await expect(email).toHaveAccessibleDescription("El correo es obligatorio");
    await expect(section(page).getByRole("alert")).toHaveText("El correo es obligatorio");
    await expect(section(page).locator('[data-slot="field"][data-invalid="true"]')).toHaveCount(1);
  });
});
