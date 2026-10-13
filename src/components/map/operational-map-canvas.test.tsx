import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mapState = vi.hoisted(() => {
  const state = {
    container: null as HTMLElement | null,
    getContainer: () => state.container,
    on: vi.fn(),
    off: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: () => 12,
    setView: vi.fn(),
  };
  return state;
});

const clusterGroupState = vi.hoisted(() => ({ animate: undefined as boolean | undefined }));

vi.mock("leaflet.markercluster", () => ({}));

vi.mock("react-leaflet", async () => {
  const ReactModule = await import("react");
  const emptyComponent = () => null;
  return {
    MapContainer: ({ children, ...props }: { children: React.ReactNode; "aria-label"?: string }) => ReactModule.createElement("div", {
      ref: (element: HTMLDivElement | null) => { if (element) mapState.container = element; },
      "aria-label": props["aria-label"],
    }, children),
    Marker: ({ children, title, icon, eventHandlers }: {
      children?: React.ReactNode;
      title?: string;
      icon?: { options?: { html?: string } };
      eventHandlers?: { click?: () => void };
    }) => ReactModule.createElement("button", {
      type: "button",
      title,
      "aria-label": title,
      "data-icon-html": icon?.options?.html,
      onClick: eventHandlers?.click,
    }, children),
    Pane: emptyComponent,
    Polygon: emptyComponent,
    Popup: emptyComponent,
    TileLayer: emptyComponent,
    Tooltip: emptyComponent,
    useMap: () => mapState,
  };
});

vi.mock("react-leaflet-cluster", async () => {
  const ReactModule = await import("react");
  return {
    default: ({
      children,
      iconCreateFunction,
      animate,
    }: {
      children: React.ReactNode;
      iconCreateFunction: (cluster: { getChildCount: () => number }) => { options: { className: string; html: string } };
      animate?: boolean;
    }) => {
      clusterGroupState.animate = animate;
      const icon = iconCreateFunction({ getChildCount: () => 3 });
      return ReactModule.createElement("div", null,
        ReactModule.createElement("div", {
          className: icon.options.className,
          onClick: () => mapState.fitBounds(),
          dangerouslySetInnerHTML: { __html: icon.options.html },
        }),
        children,
      );
    },
  };
});

import { OperationalMapCanvas } from "./operational-map-canvas";

afterEach(() => {
  vi.unstubAllGlobals();
  mapState.fitBounds.mockReset();
  clusterGroupState.animate = undefined;
});

describe("OperationalMapCanvas inventory clusters", () => {
  it("selects an inventory marker and reflects its selected state", async () => {
    const marker = {
      id: "container-1",
      layer: "containers",
      title: "CONT-001",
      description: "Contenedor activo",
      lat: -34.58,
      lng: -58.42,
      markerSymbol: "C",
      markerTone: "info" as const,
    };
    const onSelectMarker = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <OperationalMapCanvas view="inventory" markers={[marker]} onSelectMarker={onSelectMarker} />,
    );
    const markerButton = await screen.findByRole("button", { name: /CONT-001/ });
    const initialIcon = markerButton.getAttribute("data-icon-html");

    await user.click(markerButton);
    expect(onSelectMarker).toHaveBeenCalledWith(marker);

    rerender(
      <OperationalMapCanvas
        view="inventory"
        markers={[marker]}
        selectedMarkerKey="containers-container-1"
        onSelectMarker={onSelectMarker}
      />,
    );
    const selectedMarker = screen.getByRole("button", { name: /CONT-001/ });
    expect(selectedMarker.getAttribute("data-icon-html")).not.toBe(initialIcon);
  });

  it("names clusters for the inventory layer", async () => {
    render(<OperationalMapCanvas view="inventory" markers={[]} />);

    expect(await screen.findByRole("button", { name: "3 elementos de inventario; acercar para verlos" })).toBeVisible();
  });

  it("zooms cluster bounds with Enter and Space without scrolling the page", async () => {
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={[]} />);
    const cluster = await screen.findByRole("button", { name: /elementos de inventario/ });

    cluster.focus();
    await user.keyboard("{Enter}");
    expect(mapState.fitBounds).toHaveBeenCalledOnce();

    mapState.fitBounds.mockClear();
    const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    cluster.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);
    expect(mapState.fitBounds).toHaveBeenCalledOnce();
  });

  it("disables cluster animation when reduced motion is preferred", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    render(<OperationalMapCanvas view="inventory" markers={[]} />);

    await vi.waitFor(() => expect(clusterGroupState.animate).toBe(false));
  });
});
