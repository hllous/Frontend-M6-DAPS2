import { expect, type Page } from "@playwright/test";

const phoneFilters = (page: Page) => page.getByRole("button", { name: /^Filtros \(\d+\)$/ });

/** On phones the period lives in the «Filtros (n)» sheet; on desktop it sits in the filter bar. */
async function inPeriodScope(page: Page, action: () => Promise<void>) {
  const trigger = phoneFilters(page);
  if (!(await trigger.isVisible())) return action();
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Filtros" });
  await action();
  await sheet.getByRole("button", { name: "Cerrar" }).click();
  await expect(sheet).toHaveCount(0);
}

/** Drives the Services workspace period Select by accessible role. */
export async function chooseServicesPeriod(page: Page, optionName: string) {
  await inPeriodScope(page, async () => {
    await page.getByRole("combobox", { name: "Período" }).click();
    await page.getByRole("option", { name: optionName }).click();
  });
}

export async function expectServicesPeriod(page: Page, optionName: string) {
  await inPeriodScope(page, () => expect(page.getByRole("combobox", { name: "Período" })).toContainText(optionName));
}
