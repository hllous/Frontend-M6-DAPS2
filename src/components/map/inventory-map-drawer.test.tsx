import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InventoryMapDrawer } from "./inventory-map-drawer";

describe("InventoryMapDrawer", () => {
  it("toggles with its accessible button using pointer and keyboard", async () => {
    const user = userEvent.setup();

    render(
      <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos visibles · 19">
        <button type="button">Primer elemento</button>
      </InventoryMapDrawer>,
    );

    const handle = screen.getByRole("button", { name: "Mostrar lista" });
    const summary = screen.getByText("Elementos visibles · 19");
    expect(handle).toHaveAttribute("aria-expanded", "false");
    expect(handle).toHaveAttribute("aria-describedby", summary.id);

    await user.click(handle);

    expect(screen.getByRole("button", { name: "Ocultar lista" })).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Mostrar lista" })).toHaveAttribute("aria-expanded", "false");

    await user.keyboard(" ");

    expect(screen.getByRole("button", { name: "Ocultar lista" })).toHaveAttribute("aria-expanded", "true");
  });

  it("expands when keyboard focus moves from the handle into the list", async () => {
    const user = userEvent.setup();

    render(
      <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos visibles · 19">
        <button type="button">Primer elemento</button>
      </InventoryMapDrawer>,
    );

    screen.getByRole("button", { name: "Mostrar lista" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "Primer elemento" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Ocultar lista" })).toHaveAttribute("aria-expanded", "true");
  });
});
