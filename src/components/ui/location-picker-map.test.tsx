import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationPickerMap } from "./location-picker-map";
const state = vi.hoisted(() => ({ center: {lat: -34.580000012, lng: -58.420000019}, events: {} as Record<string, (event: never) => void>, setView: vi.fn() }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  TileLayer: ({eventHandlers}: {eventHandlers: {tileerror: () => void}}) => <button onClick={eventHandlers?.tileerror}>Fail tiles</button>,
  Marker: ({eventHandlers}: {eventHandlers: {dragend: (event: unknown) => void}}) => <button onClick={() => eventHandlers.dragend({target: {getLatLng: () => ({lat: -34.56, lng: -58.45})}})}>Drag pin</button>,
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
it("shows tile failure while preserving the GPS accuracy circle", async () => {
  const onPick = vi.fn();
  render(<LocationPickerMap point={{lat: -34.56, lng: -58.45}} accuracy={70} onPick={onPick} />);
  expect(screen.getByLabelText("Precisión 70 metros")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", {name: "Fail tiles"}));
  expect(screen.getByRole("status")).toHaveTextContent("Sin conexión al mapa");
  expect(screen.getByLabelText("Precisión 70 metros")).toBeInTheDocument();
});
