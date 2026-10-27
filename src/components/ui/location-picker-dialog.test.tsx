import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { LocationPickerDialog } from "./location-picker-dialog";
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));
it("cancels a nested picker without confirming and restores the parent trigger", async () => {
  const onConfirm = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(false);
    return <Dialog defaultOpen><DialogContent><DialogTitle>Abrir reporte</DialogTitle>
      <LocationPickerDialog open={open} onOpenChange={setOpen} searchAddresses={vi.fn()} onConfirm={onConfirm} trigger={<Button>Marcar en el mapa</Button>} />
    </DialogContent></Dialog>;
  }
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", {name: "Marcar en el mapa"}));
  expect(await screen.findByRole("dialog", {name: "Ubicación"})).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {name: "Cancelar"}));
  await waitFor(() => expect(screen.queryByRole("dialog", {name: "Ubicación"})).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", {name: "Marcar en el mapa"})).toHaveFocus());
  expect(onConfirm).not.toHaveBeenCalled();
});
it("traps keyboard focus, discards edits on Escape and reopens with the supplied point", async () => {
  const onConfirm = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(false);
    return <Dialog defaultOpen><DialogContent><DialogTitle>Abrir reporte</DialogTitle>
      <LocationPickerDialog open={open} onOpenChange={setOpen} currentPoint={{lat: -34.5446871, lng: -58.4386826}} searchAddresses={vi.fn()} onConfirm={onConfirm} trigger={<Button>Marcar en el mapa</Button>} />
    </DialogContent></Dialog>;
  }
  render(<Harness />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", {name: "Marcar en el mapa"}));
  const picker = await screen.findByRole("dialog", {name: "Ubicación"});
  for (let index = 0; index < 10; index++) {
    await user.tab();
    await waitFor(() => expect(picker.contains(document.activeElement)).toBe(true));
  }
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.getByRole("button", {name: "Marcar en el mapa"})).toHaveFocus());
  expect(onConfirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", {name: "Marcar en el mapa"}));
  expect(screen.getByRole("status")).toHaveTextContent("Ubicación marcada: Belgrano");
  await user.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.5446871, lng: -58.4386826}, undefined);
});
