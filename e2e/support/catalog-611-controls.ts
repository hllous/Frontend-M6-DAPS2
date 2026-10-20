import type { Page } from "@playwright/test";

export async function chooseCatalogOption(
  page: Page,
  accessibleName: string,
  optionName: string,
) {
  await page.getByRole("combobox", { name: accessibleName }).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}
