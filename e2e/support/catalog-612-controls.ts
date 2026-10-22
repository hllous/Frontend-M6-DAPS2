import { expect, type Locator, type Page } from "@playwright/test";

export async function chooseCatalogBOption(page: Page, control: Locator, optionName: string) {
  await control.click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

export async function chooseCatalogBDate(page: Page, control: Locator, isoDate: string) {
  await control.click();
  const date = new Date(`${isoDate}T12:00:00`);
  const month = `${new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date)} ${date.getFullYear()}`;
  const calendar = page.getByRole("grid");
  await expect(calendar).toBeVisible();
  const target = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  for (let step = 0; step < 120; step++) {
    if ((await calendar.getAttribute("aria-label")) === month) break;
    const selected = await control.innerText();
    // The shared calendar opens on the selected date, or the current month when empty.
    const parts = selected.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const initial = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const direction = target < initial.getTime() ? "Mes anterior" : "Mes siguiente";
    await page.getByRole("button", { name: direction, exact: true }).click();
  }
  await expect(calendar).toHaveAttribute("aria-label", month);
  const accessibleDay = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  await page.getByRole("button", { name: new RegExp(`^${accessibleDay}`) }).click();
}

export async function openCatalogBRowDetail(row: Locator) {
  const page = row.page();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const cell = row.getByRole("cell").nth(1);
  await cell.scrollIntoViewIfNeeded();
  const box = await cell.boundingBox();
  if (!box) throw new Error("The catalog row's second cell is not visible.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}
