import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationPicker } from "./location-picker";
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));
it("starts without a point and only confirms a deliberate existing point rounded to seven decimals", async () => {
  const onConfirm = vi.fn();
  const { unmount } = render(<LocationPicker searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Confirmar ubicación" })).toBeDisabled();
  unmount();
  render(<LocationPicker currentPoint={{ lat: -34.123456789, lng: -58.123456789 }} searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("Fuera de las zonas operativas");
  await userEvent.click(screen.getByRole("button", { name: "Confirmar ubicación" }));
  expect(onConfirm).toHaveBeenCalledWith({ lat: -34.1234568, lng: -58.1234568 }, undefined);
});
it("searches only on submit, announces results and returns the chosen label", async () => {
  const searchAddresses = vi.fn().mockResolvedValue([{ label: "Cabildo 1200", lat: -34.56, lng: -58.45 }]);
  const onConfirm = vi.fn();
  render(<LocationPicker initialAddress="Cabildo 1200" searchAddresses={searchAddresses} onConfirm={onConfirm} onCancel={vi.fn()} />);
  expect(searchAddresses).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Buscar dirección" }));
  expect(searchAddresses).toHaveBeenCalledWith("Cabildo 1200");
  await userEvent.click(await screen.findByRole("button", { name: "Cabildo 1200" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirmar ubicación" }));
  expect(onConfirm).toHaveBeenCalledWith({ lat: -34.56, lng: -58.45 }, "Cabildo 1200");
});
it.each([[], new Error("unavailable")])("keeps the point when search is empty or fails", async (outcome) => {
  const searchAddresses = vi.fn().mockImplementation(async () => { if (outcome instanceof Error) throw outcome; return outcome; });
  const onConfirm = vi.fn();
  render(<LocationPicker currentPoint={{lat: -34.56, lng: -58.45}} initialAddress="Cabildo" searchAddresses={searchAddresses} onConfirm={onConfirm} onCancel={vi.fn()} />);
  await userEvent.type(screen.getByRole("textbox", {name: "Dirección"}), "{Enter}");
  expect(await screen.findByText("No se encontró esa dirección. Márquela en el mapa.")).toHaveAttribute("aria-live", "polite");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.56, lng: -58.45}, undefined);
});
it("requests GPS only on press and announces a successful fix", async () => {
  const getCurrentPosition = vi.fn((success) => success({coords: {latitude: -34.56, longitude: -58.45, accuracy: 70}}));
  Object.defineProperty(navigator, "geolocation", {configurable: true, value: {getCurrentPosition}});
  const onConfirm = vi.fn();
  render(<LocationPicker searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  expect(getCurrentPosition).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", {name: "Usar mi ubicación"}));
  expect(getCurrentPosition).toHaveBeenCalledOnce();
  expect(screen.getByText("Ubicación obtenida. Puede ajustar el punto en el mapa.")).toHaveAttribute("aria-live", "polite");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.56, lng: -58.45}, undefined);
});
it.each([1, 2, 3])("preserves the point after GPS error %s", async (code) => {
  Object.defineProperty(navigator, "geolocation", {configurable: true, value: {getCurrentPosition: (_success: unknown, failure: (error: {code: number}) => void) => failure({code})}});
  const onConfirm = vi.fn();
  render(<LocationPicker currentPoint={{lat: -34.56, lng: -58.45}} searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", {name: "Usar mi ubicación"}));
  expect(screen.getByText("No se pudo obtener su ubicación. Márquela en el mapa.")).toHaveAttribute("aria-live", "polite");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.56, lng: -58.45}, undefined);
});
it("names an operational zone from the actual polygons", () => {
  render(<LocationPicker currentPoint={{lat: -34.5446871, lng: -58.4386826}} searchAddresses={vi.fn()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("Ubicación marcada: Belgrano");
});
