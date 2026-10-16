import { expect, test, type Page } from "@playwright/test";

// Real components on the dev-only fixture route (src/app/prototype/ui-components).
const evidenceDir = process.env.EVIDENCE_DIR;
const section = (page: Page) => page.getByTestId("ui-select-radio-switch");

test.describe("shadcn Select, Native Select, Radio Group and Switch", () => {
  for (const { name, width, height, control, text } of [
    { name: "desktop", width: 1440, height: 900, control: 40, text: "14px" },
    { name: "mobile", width: 390, height: 844, control: 48, text: "16px" },
  ]) {
    test(`sizes and tokens at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/prototype/ui-components");

      const height_ = (id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().height);
      const style = (id: string, prop: "fontSize" | "borderTopColor") =>
        page.locator(`#${id}`).evaluate((el, p) => getComputedStyle(el)[p], prop);

      for (const id of ["srs-zone", "srs-type", "srs-native", "srs-native-invalid"]) {
        expect(await height_(id), id).toBe(control);
        expect(await style(id, "fontSize"), id).toBe(text);
      }
      expect(await style("srs-zone", "borderTopColor")).toBe("rgb(112, 132, 154)");
      expect(await style("srs-native", "borderTopColor")).toBe("rgb(112, 132, 154)");
      expect(await style("srs-type", "borderTopColor")).toBe("rgb(159, 47, 39)");
      expect(await style("srs-native-invalid", "borderTopColor")).toBe("rgb(159, 47, 39)");
      expect(await section(page).getByRole("radio", { name: "Tarde" }).evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgb(112, 132, 154)");

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      if (evidenceDir) {
        await section(page).scrollIntoViewIfNeeded();
        await section(page).locator("#srs-zone").click();
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.screenshot({ path: `${evidenceDir}/select-radio-switch-open-${width}x${height}.png` });
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox")).toBeHidden();
        await section(page).screenshot({ path: `${evidenceDir}/select-radio-switch-section-${width}x${height}.png` });
      }
    });
  }

  test("Select opens, selects and closes with the keyboard", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    const trigger = section(page).getByRole("combobox", { name: "Zona" });
    await expect(trigger).toContainText("Norte");
    await expect(trigger).toHaveAccessibleDescription("Zona de trabajo");

    await trigger.focus();
    // transition-colors animates the outline colour, so poll until it settles.
    await expect
      .poll(() => trigger.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor];
      }))
      .toEqual(["solid", "3px", "2px", "rgb(35, 119, 189)"]);

    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(trigger).toContainText("Sur");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(trigger).toContainText("Sur");
  });

  test("clicking the label opens the Select; the Native Select takes focus and picks by keyboard", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    await section(page).getByText("Zona", { exact: true }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();

    await section(page).getByText("Estado", { exact: true }).click();
    const native = section(page).getByRole("combobox", { name: "Estado" });
    await expect(native).toBeFocused();
    await native.selectOption("cerrado");
    await expect(native).toHaveValue("cerrado");
  });

  test("Radio Group moves with the arrow keys and the label click", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    const radio = (label: string) => section(page).getByRole("radio", { name: label });
    await expect(radio("Mañana")).toBeChecked();
    await radio("Mañana").focus();
    await page.keyboard.press("ArrowDown");
    await expect(radio("Tarde")).toBeChecked();
    await expect(radio("Tarde")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(radio("Mañana")).toBeChecked();

    await section(page).getByText("Noche", { exact: true }).click();
    await expect(radio("Noche")).toBeChecked();
  });

  test("Switch toggles with Space and by clicking its label", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    const toggle = section(page).getByRole("switch", { name: "Avisar al vecino" });
    await expect(toggle).toHaveAccessibleDescription("Envía un SMS");
    await expect(toggle).not.toBeChecked();
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();
    await section(page).getByText("Avisar al vecino", { exact: true }).click();
    await expect(toggle).not.toBeChecked();
  });

  test("errors are announced on the controls", async ({ page }) => {
    await page.goto("/prototype/ui-components");

    const select = section(page).getByRole("combobox", { name: "Tipo" });
    await expect(select).toHaveAttribute("aria-invalid", "true");
    await expect(select).toHaveAccessibleDescription("El tipo es obligatorio");

    const native = section(page).getByRole("combobox", { name: "Prioridad" });
    await expect(native).toHaveAttribute("aria-invalid", "true");
    await expect(native).toHaveAccessibleDescription("La prioridad es obligatoria");

    const terms = section(page).getByRole("switch", { name: "Confirmo los datos" });
    await expect(terms).toHaveAttribute("aria-invalid", "true");
    await expect(terms).toHaveAccessibleDescription("Confirmá para continuar");

    await expect(section(page).getByRole("radio", { name: "Semanal" })).toHaveAttribute("aria-invalid", "true");
    await expect(section(page).getByRole("alert")).toHaveCount(4);
  });
});
