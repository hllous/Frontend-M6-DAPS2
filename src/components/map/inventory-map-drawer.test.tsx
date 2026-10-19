import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InventoryMapDrawer } from "./inventory-map-drawer";

describe("InventoryMapDrawer", () => {
  it("opens the mobile item panel as a keyboard-operable non-modal drawer", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(
        <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
          <button type="button">Primer elemento</button>
        </InventoryMapDrawer>,
      );

      const trigger = await screen.findByRole("button", { name: "Mostrar lista" });
      trigger.focus();
      await user.keyboard("{Enter}");

      const drawer = await screen.findByRole("dialog", { name: "Elementos" });
      expect(drawer).toBeVisible();
      expect(drawer).not.toHaveAttribute("aria-modal", "true");
      expect(within(drawer).getByRole("button", { name: "Primer elemento" })).toBeVisible();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Elementos" })).not.toBeInTheDocument());
      expect(trigger).toHaveFocus();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("hides closed mobile content from assistive technology", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(
        <InventoryMapDrawer ariaLabel="Inventario visible" summary="Elementos">
          <button type="button">Primer elemento</button>
        </InventoryMapDrawer>,
      );

      expect(screen.queryByRole("dialog", { name: "Elementos" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Primer elemento" })).not.toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "Mostrar lista" }));
      expect(await screen.findByRole("button", { name: "Primer elemento" })).toBeVisible();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("keeps the services drawer snap controls accessible", async () => {
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

      const region = await screen.findByRole("complementary", { name: "Lista de servicios" });
      await waitFor(() => expect(region).toHaveAttribute("data-snap", "half"));
      const drawer = await screen.findByRole("dialog", { name: "Servicios" });
      expect(within(drawer).getByRole("button", { name: "Servicio" })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Expandir lista a pantalla completa" }));
      expect(onSnapStateChange).toHaveBeenLastCalledWith("full");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("collapses the services drawer through its close control", async () => {
    const originalWidth = window.innerWidth;
    const onSnapStateChange = vi.fn();
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(
        <InventoryMapDrawer
          ariaLabel="Lista de servicios"
          summary="Servicios"
          snapState="full"
          onSnapStateChange={onSnapStateChange}
        >
          <button type="button">Servicio</button>
        </InventoryMapDrawer>,
      );

      await screen.findByRole("dialog", { name: "Servicios" });
      await user.click(screen.getByRole("button", { name: "Reducir lista y mostrar mapa" }));
      expect(onSnapStateChange).toHaveBeenLastCalledWith("peek");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
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
