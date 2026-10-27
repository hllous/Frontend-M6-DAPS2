import type { Locator, Page } from "@playwright/test";

type Scope = Page | Locator;

function pageFor(scope: Scope): Page {
  return "page" in scope ? scope.page() : scope;
}

async function chooseVisibleOption(page: Page, optionName: string | RegExp) {
  const listbox = page.getByRole("listbox").filter({ visible: true }).last();
  await listbox.getByRole("option", { name: optionName, exact: typeof optionName === "string" }).click();
}

/** Picks a visible option from a shared shadcn Select or Combobox by accessible name. */
export async function chooseFieldOption(
  scope: Scope,
  fieldName: string | RegExp,
  optionName: string | RegExp,
) {
  await scope.getByRole("combobox", { name: fieldName }).click();
  const page = pageFor(scope);
  await chooseVisibleOption(page, optionName);
}

/** Selects a shared radio option through its accessible role and label. */
export async function chooseFieldRadio(scope: Scope, optionName: string | RegExp) {
  await scope.getByRole("radio", { name: optionName }).click();
}

/** Picks a calendar day through the shared DatePicker's calendar grid. */
export async function chooseCalendarDay(
  scope: Scope,
  fieldName: string | RegExp,
  { monthsAhead, day, monthName, year }: { monthsAhead: number; day: number; monthName?: string; year?: number },
) {
  const page = pageFor(scope);
  await scope.getByRole("button", { name: fieldName }).click();
  const grid = page.getByRole("grid");
  for (let month = 0; month < monthsAhead; month += 1) {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  const dateName = monthName && year
    ? new RegExp(`, ${day} de ${monthName} de ${year}`, "i")
    : new RegExp(`, ${day} de `);
  await grid.getByRole("button", { name: dateName }).click();
}

/** Sets a shared 24-hour TimePicker using its named group and Select options. */
export async function setFieldTime(scope: Scope, groupName: string | RegExp, time: string) {
  const [hour, minute] = time.split(":");
  const group = scope.getByRole("group", { name: groupName });
  const page = pageFor(scope);
  for (const [fieldName, part] of [["Hora", hour], ["Minutos", minute]] as const) {
    const field = group.getByRole("combobox", { name: fieldName });
    if ((await field.innerText()).trim() === part) continue;
    await field.click();
    await chooseVisibleOption(page, part);
  }
}
