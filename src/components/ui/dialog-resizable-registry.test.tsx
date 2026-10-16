import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

function Example() {
  return (
    <Dialog>
      <DialogTrigger>Abrir</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Detalle</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog re-based on the registry", () => {
  it("exposes a titled dialog with Spanish close labels and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Abrir" });

    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Título" });
    expect(dialog).toHaveAccessibleDescription("Detalle");
    expect(screen.getByRole("button", { name: "Cerrar diálogo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes from the footer close button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(await screen.findByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Resizable re-based on the registry", () => {
  it("renders a vertical group and a keyboard-focusable separator", () => {
    render(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize="50%">A</ResizablePanel>
        <ResizableHandle aria-label="Redimensionar" />
        <ResizablePanel defaultSize="50%">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole("separator", { name: "Redimensionar" });
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    expect(separator).toHaveAttribute("tabindex", "0");
  });
});
