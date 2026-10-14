import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InventoryMapDrawer } from "./inventory-map-drawer";

describe("InventoryMapDrawer", () => {
  it("toggles with its accessible button using pointer and keyboard", async () => {
    const user = userEvent.setup();

    render(
      <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
        <button type="button">Primer elemento</button>
      </InventoryMapDrawer>,
    );

    const handle = screen.getByRole("button", { name: "Mostrar lista" });
    const summary = screen.getByText("Elementos");
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
      <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
        <button type="button">Primer elemento</button>
      </InventoryMapDrawer>,
    );

    screen.getByRole("button", { name: "Mostrar lista" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "Primer elemento" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Ocultar lista" })).toHaveAttribute("aria-expanded", "true");
  });

  it("hides collapsed compact content from assistive technology until expanded", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(
        <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
          <button type="button">Primer elemento</button>
        </InventoryMapDrawer>,
      );

      const drawer = await screen.findByRole("complementary", { name: "Inventario visible" });
      await waitFor(() => expect(drawer).toHaveAttribute("data-compact", "true"));
      const handle = screen.getByRole("button", { name: "Mostrar lista" });
      const content = drawer.querySelector(`#${handle.getAttribute("aria-controls")}`)!;

      expect(content).toHaveAttribute("aria-hidden", "true");
      expect(content).toHaveAttribute("inert");
      expect(screen.queryByRole("button", { name: "Primer elemento" })).not.toBeInTheDocument();

      await user.click(handle);

      expect(screen.getByRole("button", { name: "Primer elemento" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("moves from half to full on an upward drag and exposes the next snap action", async () => {
    const originalWidth = window.innerWidth;
    const onSnapStateChange = vi.fn();
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(
        <InventoryMapDrawer
          ariaLabel="Lista de servicios"
          summary="Servicios"
          snapState="half"
          onSnapStateChange={onSnapStateChange}
        >
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      const drawer = await screen.findByRole("complementary", { name: "Lista de servicios" });
      await waitFor(() => expect(drawer).toHaveAttribute("data-compact", "true"));
      expect(drawer).toHaveAttribute("data-snap", "half");
      const handle = screen.getByRole("button", { name: "Expandir lista a pantalla completa" });
      expect(handle).toHaveAttribute("aria-expanded", "true");
      vi.spyOn(drawer, "getBoundingClientRect").mockReturnValue({ height: 500 } as DOMRect);

      fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch", clientY: 320 });
      fireEvent.pointerMove(handle, { pointerId: 1, pointerType: "touch", clientY: 100 });
      fireEvent.pointerUp(handle, { pointerId: 1, pointerType: "touch", clientY: 100 });
      expect(onSnapStateChange).toHaveBeenLastCalledWith("full");

      await user.click(handle);
      expect(onSnapStateChange).toHaveBeenLastCalledWith("full");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });
});
