import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { notifyError, notifySuccess } from "./feedback";
import { Toaster } from "./sonner";

describe("action feedback toasts", () => {
  beforeAll(() => {
    // jsdom lacks pointer capture, which Sonner calls on pointerdown
    Element.prototype.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it("shows a success result in the notifications region, in Spanish", async () => {
    render(<Toaster />);
    act(() => {
      notifySuccess("Servicio guardado");
    });
    expect(await screen.findByText("Servicio guardado")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /notificaciones/i })).toBeInTheDocument();
  });

  it("shows an error result with the message and dismisses it with the keyboard-reachable close button", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      notifyError("No se pudo guardar el servicio");
    });
    const message = await screen.findByText("No se pudo guardar el servicio");
    const toast = message.closest("li");
    expect(toast).toHaveAttribute("data-type", "error");
    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    await waitFor(() => expect(screen.queryByText("No se pudo guardar el servicio")).not.toBeInTheDocument());
  });
});
