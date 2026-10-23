import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationPickerMap } from "./location-picker-map";
import { LocationPicker } from "./location-picker";
vi.mock("next/dynamic", () => ({ default: () => LocationPickerMap }));
const state = vi.hoisted(() => ({ center: {lat: -34.580000012, lng: -58.420000019}, draggedPoint: {lat: -34.56, lng: -58.45}, events: {} as Record<string, (event: never) => void>, setView: vi.fn(), zoom: 12, map: undefined as never }));
state.map = {getCenter: () => state.center, setView: state.setView, getZoom: () => state.zoom, getContainer: () => document.createElement("div"), invalidateSize: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn()} as never;
vi.mock("react-leaflet", () => ({
  MapContainer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  TileLayer: ({eventHandlers}: {eventHandlers: {tileerror: () => void}}) => <button onClick={eventHandlers?.tileerror}>Fail tiles</button>,
  Marker: ({eventHandlers}: {eventHandlers: {dragend: (event: unknown) => void}}) => <button onClick={() => eventHandlers.dragend({target: {getLatLng: () => state.draggedPoint}})}>Drag pin</button>,
  Circle: ({radius}: {radius: number}) => <div aria-label={`Precisión ${radius} metros`} />,
  useMap: () => state.map,
  useMapEvents: (events: typeof state.events) => {state.events = events; return {getCenter: () => state.center};},
}));
it("has no crosshair or center button and accepts map tap and pin drag", async () => {
  const onPick = vi.fn();
  render(<LocationPickerMap point={{lat: -34.58, lng: -58.42}} onPick={onPick} />);
  expect(screen.queryByRole("button", {name: "Marcar centro del mapa"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "Drag pin"}));
  expect(onPick).toHaveBeenLastCalledWith({lat: -34.56, lng: -58.45});
  state.events.click({latlng: {lat: -34.57, lng: -58.46}} as never);
  expect(onPick).toHaveBeenLastCalledWith({lat: -34.57, lng: -58.46});
});
it.each(["tap", "drag"])("recognizes a repeated-world zone and confirms canonical seven-decimal coordinates after %s", async (action) => {
  const onConfirm = vi.fn();
  const repeatedPoint = {lat: -34.544687123, lng: -418.438682612};
  render(<LocationPicker currentPoint={{lat: -34.58, lng: -58.42}} searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  if (action === "tap") {
    act(() => state.events.click({latlng: repeatedPoint} as never));
  } else if (action === "drag") {
    state.draggedPoint = repeatedPoint;
    await userEvent.click(screen.getByRole("button", {name: "Drag pin"}));
    state.draggedPoint = {lat: -34.56, lng: -58.45};
  }
  expect(screen.getByRole("status")).toHaveTextContent("Ubicación marcada: Belgrano");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.5446871, lng: -58.4386826}, undefined);
});
it("pans to a newly selected point with an animation", () => {
  state.setView.mockClear();
  render(<LocationPickerMap point={{lat: -34.6, lng: -58.38}} onPick={vi.fn()} />);
  expect(state.setView).toHaveBeenCalledWith([-34.6, -58.38], 15, expect.objectContaining({animate: true}));
});
it("glides the centre from the previous point to the next on a short hop at the same zoom", async () => {
  state.zoom = 15;
  state.setView.mockClear();
  const first = {lat: -34.6036, lng: -58.3809};
  const second = {lat: -34.6037, lng: -58.3810};
  const { rerender } = render(<LocationPickerMap point={first} onPick={vi.fn()} />);
  await waitFor(() => expect(state.setView).toHaveBeenLastCalledWith([first.lat, first.lng], 15, {animate: false}), {timeout: 3000});
  state.setView.mockClear();
  rerender(<LocationPickerMap point={second} onPick={vi.fn()} />);
  await waitFor(() => expect(state.setView).toHaveBeenLastCalledWith([second.lat, second.lng], 15, {animate: false}), {timeout: 3000});
  const lats = state.setView.mock.calls.map(([center]) => center[0] as number);
  expect(lats.length).toBeGreaterThan(2);
  expect(lats.every((lat, index) => lat >= second.lat && lat <= state.center.lat && (index === 0 || lat <= lats[index - 1]))).toBe(true);
  state.zoom = 12;
});
it("shows tile failure while preserving the GPS accuracy circle", async () => {
  const onPick = vi.fn();
  render(<LocationPickerMap point={{lat: -34.56, lng: -58.45}} accuracy={70} onPick={onPick} />);
  expect(screen.getByLabelText("Precisión 70 metros")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {name: "Fail tiles"}));
  expect(screen.getByRole("status")).toHaveTextContent("Sin conexión al mapa");
  expect(screen.getByLabelText("Precisión 70 metros")).toBeInTheDocument();
});
it("accepts an eastern repeated-world point outside every operational zone", async () => {
  const onConfirm = vi.fn();
  render(<LocationPicker searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  act(() => state.events.click({latlng: {lat: -33.868800012, lng: 1231.209900019}} as never));
  expect(screen.getByRole("status")).toHaveTextContent("Fuera de las zonas operativas");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -33.8688, lng: 151.2099}, undefined);
});
