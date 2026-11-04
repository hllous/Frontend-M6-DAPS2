import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CompactPager } from "./compact-pager";

it("navega y deshabilita los límites", async () => {
  const change = vi.fn();
  const { rerender } = render(<CompactPager page={1} totalPages={3} onPageChange={change} />);
  expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(change).toHaveBeenCalledWith(2);
  rerender(<CompactPager page={3} totalPages={3} onPageChange={change} />);
  expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Página anterior" }));
  expect(change).toHaveBeenCalledWith(2);
});
