import { expect, type Locator, type Page } from "@playwright/test";

export async function chooseCatalogAOption(
  page: Page,
  scope: Page | Locator,
  label: string | RegExp,
  choice: string | RegExp | { index: number },
) {
  const trigger = scope.getByRole("combobox", { name: label, exact: typeof label === "string" });
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await trigger.click();
  const option =
    typeof choice === "object" && "index" in choice
      ? page.getByRole("option").nth(choice.index)
      : page.getByRole("option", {
          name: choice as string | RegExp,
          exact: typeof choice === "string",
        });
  await expect(option).toBeVisible();
  if (await option.getAttribute("aria-selected") === "true") {
    await page.keyboard.press("Escape");
  } else {
    await option.click();
  }
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

export async function expectCatalogAMutation(
  page: Page,
  endpoint: RegExp,
  payload: unknown,
  action: () => Promise<unknown>,
) {
  const request = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      endpoint.test(new URL(request.url()).pathname),
  );
  await action();
  const sent = await request;
  expect(payload === null ? sent.postData() : sent.postDataJSON()).toEqual(
    payload,
  );
}
