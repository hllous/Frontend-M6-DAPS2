import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const polygonState = vi.hoisted(() => ({ pathOptions: new Set<unknown>() }));
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
    Pane: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children),
    Polygon: ({ pathOptions }: { pathOptions?: unknown }) => {
      polygonState.pathOptions.add(pathOptions);
      return null;
    },
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

vi.mock("@/lib/communes", () => ({
  communesAdapter: { list: vi.fn().mockResolvedValue([{ id: "c1", code: "comuna-14", name: "Comuna 14", active: true, zones: [] }]) },
}));
vi.mock("@/lib/neighborhoods", () => ({
  neighborhoodsAdapter: {
    list: vi.fn().mockResolvedValue([
      { id: "n1", codigo: "palermo", nombre: "Palermo", zona: "comuna-14", activo: true },
      { id: "n2", codigo: "sin-poligono", nombre: "Barrio sin polígono", zona: "comuna-14", activo: true },
    ]),
  },
}));

import { resetMapBoundariesCache } from "./map-boundaries";
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

    expect(await screen.findByRole("button", { name: "3 elementos; acerque el mapa" })).toBeVisible();
  });

  it("zooms cluster bounds with Enter and Space without scrolling the page", async () => {
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={[]} />);
    const cluster = await screen.findByRole("button", { name: /elementos; acerque el mapa/ });

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

describe("OperationalMapCanvas comunas y barrios (#708, #709, #720)", () => {
  beforeEach(() => {
    resetMapBoundariesCache();
    polygonState.pathOptions.clear();
  });

  const square = (south: number, west: number) => ({
    type: "Polygon",
    coordinates: [[[west, south], [west + 1, south], [west + 1, south + 1], [west, south + 1], [west, south]]],
  });
  const communes = {
    features: [
      { properties: { COMUNAS: 14 }, geometry: square(0, 0) },
      { properties: { COMUNAS: 1 }, geometry: square(0, 2) },
    ],
  };
  const barrios = {
    features: [
      { properties: { BARRIO: "PALERMO", COMUNA: 14 }, geometry: square(0, 0) },
      // Polygon whose barrio the API does not know.
      { properties: { BARRIO: "RETIRO", COMUNA: 1 }, geometry: square(0, 2) },
    ],
  };
  const marker = (id: string, lat: number, lng: number) => ({
    id,
    layer: "containers",
    title: id,
    description: "Contenedor",
    lat,
    lng,
    markerSymbol: "C",
    markerTone: "info" as const,
  });
  const markers = [marker("EN-PALERMO", 0.5, 0.5), marker("EN-RETIRO", 0.5, 2.5), marker("AFUERA", 50, 50)];

  function stubGeoJson() {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes("comunas") ? communes : barrios),
    })));
  }

  it("shows every marker with everything visible and filters by the layer list", async () => {
    stubGeoJson();
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={markers} />);

    await user.click(await screen.findByRole("button", { name: "Comunas y barrios" }));
    expect(screen.getByRole("button", { name: /EN-PALERMO/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /AFUERA/ })).toBeVisible();
    // The API barrio without a polygon is listed but cannot be toggled.
    expect(screen.getByRole("checkbox", { name: /Barrio sin polígono/ })).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Ocultar todos" }));
    expect(screen.queryByRole("button", { name: /EN-PALERMO/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /AFUERA/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Palermo" }));
    expect(screen.getByRole("button", { name: /EN-PALERMO/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /EN-RETIRO/ })).not.toBeInTheDocument();
    // Showing a barrio of a hidden commune shows it alone.
    expect(screen.getByRole("checkbox", { name: "Comuna 14" })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(screen.getAllByRole("button", { name: /EN-|AFUERA/ })).toHaveLength(3);
  });

  it("hiding a commune hides its barrios and their markers", async () => {
    stubGeoJson();
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={markers} />);

    await user.click(await screen.findByRole("button", { name: "Comunas y barrios" }));
    await user.click(screen.getByRole("checkbox", { name: "Comuna 14" }));

    expect(screen.getByRole("checkbox", { name: "Palermo" })).not.toBeChecked();
    expect(screen.queryByRole("button", { name: /EN-PALERMO/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /EN-RETIRO/ })).toBeVisible();
  });

  it("keeps the map working and says so when the GeoJSON cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    render(<OperationalMapCanvas view="inventory" markers={markers} />);

    expect(await screen.findByRole("button", { name: /EN-PALERMO/ })).toBeVisible();
    expect(await screen.findByRole("status")).toHaveTextContent("No se pudieron cargar las comunas y barrios.");
    expect(screen.queryByRole("button", { name: "Comunas y barrios" })).not.toBeInTheDocument();
  });

  it("hides markers outside every barrio once a filter is active", async () => {
    stubGeoJson();
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={markers} />);

    await user.click(await screen.findByRole("button", { name: "Comunas y barrios" }));
    await user.click(screen.getByRole("checkbox", { name: "Comuna 1" }));
    expect(screen.queryByRole("button", { name: /AFUERA/ })).not.toBeInTheDocument();
    expect(screen.getByText("(filtro activo)")).toBeInTheDocument();
  });

  it("never hides the selected marker, so its detail cannot stay open over nothing", async () => {
    stubGeoJson();
    const user = userEvent.setup();
    render(<OperationalMapCanvas view="inventory" markers={markers} selectedMarkerKey="containers-AFUERA" />);

    await user.click(await screen.findByRole("button", { name: "Comunas y barrios" }));
    await user.click(screen.getByRole("button", { name: "Ocultar todos" }));
    expect(screen.getByRole("button", { name: /AFUERA/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /EN-PALERMO/ })).not.toBeInTheDocument();
  });

  it("keeps the polygon style objects stable across re-renders", async () => {
    stubGeoJson();
    const { rerender } = render(<OperationalMapCanvas view="inventory" markers={markers} />);
    await screen.findByRole("button", { name: "Comunas y barrios" });
    const before = polygonState.pathOptions.size;
    expect(before).toBeGreaterThan(0);

    rerender(<OperationalMapCanvas view="inventory" markers={[...markers]} />);
    rerender(<OperationalMapCanvas view="inventory" markers={[...markers]} />);
    expect(polygonState.pathOptions.size).toBe(before);
  });
});
