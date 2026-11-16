import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PublicGreenPoint } from "@/lib/public-green-points";

const mapState = vi.hoisted(() => ({
  panTo: vi.fn(),
  setView: vi.fn(),
  fitBounds: vi.fn(),
  closePopup: vi.fn(),
}));
const markerState = vi.hoisted(() => ({ openPopup: vi.fn(), elements: new Map<string, HTMLElement>() }));

vi.mock("react-leaflet", async () => {
  const ReactModule = await import("react");
  return {
    MapContainer: ({ children, ...props }: { children: React.ReactNode; "aria-label"?: string }) =>
      ReactModule.createElement("div", { "aria-label": props["aria-label"] }, children),
    TileLayer: () => null,
    ZoomControl: () => null,
    useMap: () => mapState,
    Popup: ({ children }: { children: React.ReactNode }) => ReactModule.createElement("div", { "data-testid": "popup" }, children),
    Marker: ReactModule.forwardRef(function Marker(
      { children, title, alt, eventHandlers, zIndexOffset }: { children?: React.ReactNode; title?: string; alt?: string; eventHandlers?: { click?: () => void }; zIndexOffset?: number },
      ref: React.ForwardedRef<unknown>,
    ) {
      const element = ReactModule.useRef<HTMLButtonElement | null>(null);
      ReactModule.useImperativeHandle(ref, () => ({ getElement: () => element.current, openPopup: markerState.openPopup }), []);
      return ReactModule.createElement("button", { ref: element, type: "button", title, "data-alt": alt, "data-z": zIndexOffset, onClick: eventHandlers?.click }, children);
    }),
  };
});

import { GreenPointsMapCanvas } from "./green-points-map-canvas";

type Located = PublicGreenPoint & { lat: number; lng: number };
const point = (id: string, overrides: Partial<Located> = {}): Located => ({
  id,
  name: `Punto ${id}`,
  address: `Calle ${id} 100`,
  zoneId: "zone-1",
  wasteTypes: ["HOUSEHOLD", "RECYCLABLE"],
  lat: -34.6,
  lng: -58.4,
  ...overrides,
}) as Located;

beforeEach(() => {
  Object.values(mapState).forEach((fn) => fn.mockReset());
  markerState.openPopup.mockReset();
});

describe("GreenPointsMapCanvas", () => {
  it("labels each marker for assistive technology and reports the clicked point", async () => {
    const onSelect = vi.fn();
    render(<GreenPointsMapCanvas points={[point("a"), point("b", { address: "" })]} selectedPointId={null} onSelect={onSelect} />);

    const markers = screen.getAllByRole("button", { name: /Punto/ , hidden: true }).filter((el) => el.hasAttribute("data-alt"));
    expect(markers).toHaveLength(2);
    expect(markers[0]).toHaveAttribute("title", "Punto a · Calle a 100");
    expect(markers[1]).toHaveAttribute("title", "Punto b · Dirección no informada");
    expect(markers[0]).toHaveAttribute("aria-label", "Punto verde: Punto a");
    expect(markers[0]).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(markers[1]!);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("marks the selected point as pressed, raises it, opens its popup and pans to it", () => {
    render(<GreenPointsMapCanvas points={[point("a"), point("b", { lat: -34.7, lng: -58.5 })]} selectedPointId="b" onSelect={vi.fn()} />);

    const selected = screen.getAllByRole("button", { hidden: true }).find((el) => el.getAttribute("title")?.startsWith("Punto b"))!;
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected).toHaveAttribute("data-z", "1000");
    expect(markerState.openPopup).toHaveBeenCalledTimes(1);
    expect(mapState.panTo).toHaveBeenCalledWith([-34.7, -58.5], { animate: false });
    expect(mapState.setView).not.toHaveBeenCalled();
    expect(mapState.fitBounds).not.toHaveBeenCalled();
  });

  it("centers on a lone point and fits the bounds of several", () => {
    const { rerender } = render(<GreenPointsMapCanvas points={[point("a", { lat: -34.61, lng: -58.41 })]} selectedPointId={null} onSelect={vi.fn()} />);
    expect(mapState.setView).toHaveBeenCalledWith([-34.61, -58.41], 14);

    rerender(<GreenPointsMapCanvas points={[point("a"), point("b", { lat: -34.7, lng: -58.5 })]} selectedPointId={null} onSelect={vi.fn()} />);
    expect(mapState.fitBounds).toHaveBeenCalledTimes(1);
    expect(mapState.fitBounds.mock.calls[0]![1]).toEqual({ padding: [24, 24], maxZoom: 14 });
    expect(markerState.openPopup).not.toHaveBeenCalled();
  });

  it("does not move the map when there are no located points", () => {
    render(<GreenPointsMapCanvas points={[]} selectedPointId={null} onSelect={vi.fn()} />);
    expect(mapState.panTo).not.toHaveBeenCalled();
    expect(mapState.setView).not.toHaveBeenCalled();
    expect(mapState.fitBounds).not.toHaveBeenCalled();
  });

  it("lists the waste labels in the popup and closes it from the close button", async () => {
    render(<GreenPointsMapCanvas points={[point("a")]} selectedPointId="a" onSelect={vi.fn()} />);

    const popup = screen.getByTestId("popup");
    expect(popup).toHaveTextContent("Domiciliarios, Reciclables");
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar información de Punto a" }));
    expect(mapState.closePopup).toHaveBeenCalledTimes(1);
  });
});
