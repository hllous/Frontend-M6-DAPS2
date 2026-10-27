import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

export async function chooseCatalogOption(
  user: ReturnType<typeof userEvent.setup>,
  control: HTMLElement,
  name: string | RegExp,
) {
  await user.click(control);
  await user.click(await screen.findByRole("option", { name }));
}
