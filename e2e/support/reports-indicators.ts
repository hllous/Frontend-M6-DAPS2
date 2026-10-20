import { expect, type Locator, type Page } from "@playwright/test";

function ownerPage(scope: Page | Locator): Page {
  const locator = scope as Locator;
  return typeof locator.page === "function" ? locator.page() : scope as Page;
}

export async function chooseOption(scope: Page | Locator, label: string | RegExp, option: string | RegExp) {
  await scope.getByRole("combobox", { name: label }).click();
  await ownerPage(scope).getByRole("listbox").getByRole("option", { name: option, ...(typeof option === "string" ? { exact: true } : {}) }).click();
}

export async function chooseDate(scope: Page | Locator, label: string, value: string) {
  const page = ownerPage(scope);
  const trigger = scope.getByRole("button", { name: label });
  const displayedValue = (await trigger.textContent())?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const currentMonth = displayedValue ? Number(displayedValue[2]) - 1 : new Date().getMonth();
  const currentYear = displayedValue ? Number(displayedValue[3]) : new Date().getFullYear();
  const [year, month, day] = value.split("-").map(Number);
  const offset = (year - currentYear) * 12 + month - 1 - currentMonth;

  await trigger.click();
  for (let index = 0; index < Math.abs(offset); index += 1) {
    await page.getByRole("button", { name: offset < 0 ? "Mes anterior" : "Mes siguiente" }).click();
  }
  const dateLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
  await page.getByRole("button", { name: new RegExp(`(?:^|,\\s)${dateLabel}$`, "i") }).click();
}

export async function chooseTime(scope: Page | Locator, label: string, value: string) {
  const page = ownerPage(scope);
  const [hour, minute] = value.split(":");
  const timeGroup = scope.getByRole("group", { name: label });
  // Teclado: las listas de hora/minuto se alinean al ítem seleccionado y salen parcialmente del viewport en mobile, donde el click de Playwright no las estabiliza.
  for (const [name, option] of [["Hora", hour], ["Minutos", minute]] as const) {
    await timeGroup.getByRole("combobox", { name }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.type(option);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
  await expect(timeGroup.getByRole("combobox", { name: "Hora" })).toContainText(hour);
  await expect(timeGroup.getByRole("combobox", { name: "Minutos" })).toContainText(minute);
}
