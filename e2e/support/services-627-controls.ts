import { expect, type Page } from "@playwright/test";

/** Drives the Services workspace period Select by accessible role. */
export async function chooseServicesPeriod(page: Page, optionName: string) {
  await page.getByRole("combobox", { name: "Período" }).click();
  await page.getByRole("option", { name: optionName }).click();
}

export async function expectServicesPeriod(page: Page, optionName: string) {
  await expect(page.getByRole("combobox", { name: "Período" })).toContainText(optionName);
}
