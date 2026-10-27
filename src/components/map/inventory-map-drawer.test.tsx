import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InventoryMapDrawer } from "./inventory-map-drawer";

async function withWidth(width: number, run: () => Promise<void>) {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  try {
    await run();
  } finally {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  }
}

describe("InventoryMapDrawer", () => {
  it("renders a draggable sheet with a handle and no expand button", async () => {
    await withWidth(390, async () => {
      render(
        <InventoryMapDrawer ariaLabel="Lista de servicios" summary="25 servicios">
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      const drawer = await screen.findByRole("dialog", { name: "25 servicios" });
      expect(drawer).not.toHaveAttribute("aria-modal", "true");
      expect(within(drawer).getByRole("slider", { name: "Altura de la lista" })).toHaveAttribute("aria-valuetext", "colapsada");
      expect(screen.queryByRole("button", { name: /expandir/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cerrar lista" })).not.toBeInTheDocument();
    });
  });

  it("hides the collapsed list content from assistive technology", async () => {
    await withWidth(390, async () => {
      render(
        <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
          <button type="button">Primer elemento</button>
        </InventoryMapDrawer>,
      );

      await screen.findByRole("dialog", { name: "Elementos" });
      expect(screen.queryByRole("button", { name: "Primer elemento" })).not.toBeInTheDocument();
    });
  });

  it("changes snap with the handle by keyboard", async () => {
    await withWidth(390, async () => {
      const onSnapStateChange = vi.fn();
      const user = userEvent.setup();
      render(
        <InventoryMapDrawer ariaLabel="Lista de servicios" summary="Servicios" onSnapStateChange={onSnapStateChange}>
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      const region = await screen.findByRole("complementary", { name: "Lista de servicios" });
      const handle = await screen.findByRole("slider", { name: "Altura de la lista" });
      handle.focus();
      await user.keyboard("{Enter}");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("half");
      await waitFor(() => expect(region).toHaveAttribute("data-snap", "half"));
      expect(handle).toHaveAttribute("aria-valuetext", "media");
      expect(await screen.findByRole("button", { name: "Servicio" })).toBeVisible();

      await user.keyboard("{ArrowUp}");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("full");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("peek");
      await user.keyboard("{End}");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("full");
      await user.keyboard(" ");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("peek");
    });
  });

  it("does not change snap when the handle is clicked", async () => {
    await withWidth(390, async () => {
      const onSnapStateChange = vi.fn();
      const user = userEvent.setup();
      render(
        <InventoryMapDrawer ariaLabel="Lista de servicios" summary="Servicios" snapState="half" onSnapStateChange={onSnapStateChange}>
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      await user.click(await screen.findByRole("slider", { name: "Altura de la lista" }));
      expect(onSnapStateChange).not.toHaveBeenCalled();
    });
  });

  it("collapses instead of closing on Escape and hides while suspended", async () => {
    await withWidth(390, async () => {
      const onSnapStateChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <InventoryMapDrawer ariaLabel="Lista de servicios" summary="Servicios" snapState="full" onSnapStateChange={onSnapStateChange}>
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      await screen.findByRole("dialog", { name: "Servicios" });
      await user.keyboard("{Escape}");
      expect(onSnapStateChange).toHaveBeenLastCalledWith("peek");

      rerender(
        <InventoryMapDrawer ariaLabel="Lista de servicios" summary="Servicios" snapState="full" suspended>
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Servicios" })).not.toBeInTheDocument());
    });
  });

  it("renders the desktop inventory panel as a complementary region", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });

    try {
      render(
        <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
          <button type="button">Primer elemento</button>
        </InventoryMapDrawer>,
      );

      const panel = await screen.findByRole("complementary", { name: "Inventario visible" });
      expect(within(panel).getByRole("button", { name: "Primer elemento" })).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });
});
