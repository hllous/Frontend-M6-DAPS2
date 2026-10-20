import type { Locator, Page } from "@playwright/test";

type Scope = Page | Locator;

/** Opens a shadcn Select (role combobox) by its field label and picks one option by its visible text. */
export async function chooseDialogOption(
  scope: Scope,
  fieldName: string | RegExp,
  optionName: string | RegExp,
) {
  await scope.getByRole("combobox", { name: fieldName }).click();
  const page = "page" in scope ? scope.page() : scope;
  await page.getByRole("option", { name: optionName, exact: typeof optionName === "string" }).click();
}

/**
 * Picks a day in the shared date picker by moving `monthsAhead` months forward from the month it opens on
 * and clicking `day` (1-28 keeps it valid in every month). Returns the picker's dd/mm/aaaa label.
 */
export async function pickDialogDay(
  scope: Scope,
  fieldName: string | RegExp,
  { monthsAhead, day }: { monthsAhead: number; day: number },
) {
  const page = "page" in scope ? scope.page() : scope;
  const trigger = scope.getByRole("button", { name: fieldName });
  await trigger.click();
  const grid = page.getByRole("grid");
  for (let month = 0; month < monthsAhead; month += 1) {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  await grid.getByRole("button", { name: new RegExp(`, ${day} de `) }).click();
  return (await trigger.textContent())?.trim() ?? "";
}

/** Sets a shared time picker (two Selects, 24-hour) found by the group name of its field label. */
export async function setDialogTime(scope: Scope, groupName: string | RegExp, time: string) {
  const [hour, minute] = time.split(":");
  const group = scope.getByRole("group", { name: groupName });
  const page = "page" in scope ? scope.page() : scope;
  await group.getByRole("combobox", { name: "Hora" }).click();
  await page.getByRole("option", { name: hour, exact: true }).click();
  await group.getByRole("combobox", { name: "Minutos" }).click();
  await page.getByRole("option", { name: minute, exact: true }).click();
}
