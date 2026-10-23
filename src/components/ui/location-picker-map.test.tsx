import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationPickerMap } from "./location-picker-map";
import { LocationPicker } from "./location-picker";
vi.mock("next/dynamic", () => ({ default: () => LocationPickerMap }));
const state = vi.hoisted(() => ({ center: {lat: -34.580000012, lng: -58.420000019}, draggedPoint: {lat: -34.56, lng: -58.45}, events: {} as Record<string, (event: never) => void>, setView: vi.fn() }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  TileLayer: ({eventHandlers}: {eventHandlers: {tileerror: () => void}}) => <button onClick={eventHandlers?.tileerror}>Fail tiles</button>,
  Marker: ({eventHandlers}: {eventHandlers: {dragend: (event: unknown) => void}}) => <button onClick={() => eventHandlers.dragend({target: {getLatLng: () => state.draggedPoint}})}>Drag pin</button>,
  Circle: ({radius}: {radius: number}) => <div aria-label={`Precisión ${radius} metros`} />,
  useMap: () => ({getCenter: () => state.center, setView: state.setView, getZoom: () => 12, getContainer: () => document.createElement("div"), invalidateSize: vi.fn()}),
  useMapEvents: (events: typeof state.events) => {state.events = events; return {getCenter: () => state.center};},
}));
it("marks the crosshair and accepts map tap and pin drag", async () => {
  const onPick = vi.fn();
  render(<LocationPickerMap point={{lat: -34.58, lng: -58.42}} onPick={onPick} />);
  await userEvent.click(screen.getByRole("button", {name: "Marcar centro del mapa"}));
  expect(onPick).toHaveBeenLastCalledWith(state.center);
  fireEvent.click(screen.getByRole("button", {name: "Drag pin"}));
  expect(onPick).toHaveBeenLastCalledWith({lat: -34.56, lng: -58.45});
  state.events.click({latlng: {lat: -34.57, lng: -58.46}} as never);
  expect(onPick).toHaveBeenLastCalledWith({lat: -34.57, lng: -58.46});
});
it.each(["tap", "drag", "crosshair"])("recognizes a repeated-world zone and confirms canonical seven-decimal coordinates after %s", async (action) => {
  const onConfirm = vi.fn();
  const repeatedPoint = {lat: -34.544687123, lng: -418.438682612};
  render(<LocationPicker currentPoint={{lat: -34.58, lng: -58.42}} searchAddresses={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} />);
  if (action === "tap") {
    act(() => state.events.click({latlng: repeatedPoint} as never));
  } else if (action === "drag") {
    state.draggedPoint = repeatedPoint;
    await userEvent.click(screen.getByRole("button", {name: "Drag pin"}));
    state.draggedPoint = {lat: -34.56, lng: -58.45};
  } else {
    state.center = repeatedPoint;
    await userEvent.click(screen.getByRole("button", {name: "Marcar centro del mapa"}));
    state.center = {lat: -34.580000012, lng: -58.420000019};
  }
  expect(screen.getByRole("status")).toHaveTextContent("Ubicación marcada: Belgrano");
  await userEvent.click(screen.getByRole("button", {name: "Confirmar ubicación"}));
  expect(onConfirm).toHaveBeenCalledWith({lat: -34.5446871, lng: -58.4386826}, undefined);
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
