import { expect, type Locator, type Page } from "@playwright/test";

type TreeSelectScope = Page | Locator;
type AccessibleName = string | RegExp;

export async function chooseTreeSelectOption(
  page: Page,
  scope: TreeSelectScope,
  label: AccessibleName,
  optionName: AccessibleName,
) {
  const trigger = scope.getByRole("combobox", { name: label });
  await trigger.click();
  const option = page.getByRole("option", { name: optionName, exact: typeof optionName === "string" });
  await expect(option).toBeVisible();
  await option.click();
}

export async function chooseTreeSelectOptions(
  page: Page,
  scope: TreeSelectScope,
  label: AccessibleName,
  optionNames: AccessibleName[],
) {
  const trigger = scope.getByRole("combobox", { name: label });

  for (const optionName of optionNames) {
    await trigger.click();
    let option = page.getByRole("option", { name: optionName, exact: typeof optionName === "string" });
    await expect(option).toBeVisible();
    await option.click();
    await page.keyboard.press("Escape");
  }
}
