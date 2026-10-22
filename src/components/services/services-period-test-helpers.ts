import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Drives the shadcn period Select by accessible role: open the combobox, pick the option by name. */
export function periodSelect() {
  return screen.getByRole("combobox", { name: "Período" });
}

export async function choosePeriod(optionName: string) {
  const user = userEvent.setup();
  periodSelect().focus();
  await user.keyboard("{Enter}");
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: optionName }));
}
