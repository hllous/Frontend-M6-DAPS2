import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Clicks "Iniciar servicio" inside `scope`. A Service outside its window asks for confirmation (#910):
 * the trigger then announces a dialog, and this confirms it with "Iniciar igual". Returns the
 * confirmation dialog (still open if the start failed) or null when the start was one tap.
 */
export async function startService(page: Page, scope: Locator): Promise<Locator | null> {
  const trigger = scope.getByRole("button", { name: "Iniciar servicio" });
  const asksConfirmation = (await trigger.getAttribute("aria-haspopup")) === "dialog";
  await trigger.click();
  if (!asksConfirmation) return null;
  const dialog = page.getByRole("dialog", { name: "Iniciar servicio fuera de horario" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Iniciar igual" }).click();
  return dialog;
}
