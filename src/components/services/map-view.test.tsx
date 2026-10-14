import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapView } from "./map-view";
import { containerFixtures } from "@/lib/containers-fixtures";
import { greenPointFixtures } from "@/lib/green-point-fixtures";
import { operationalMapAdapter, type OperationalMapData } from "@/lib/operational-map";
import { operationalZonesAdapter, resolveOperationalZones } from "@/lib/operational-zones";
import { treeFixtures } from "@/lib/tree-fixtures";
import type { Service } from "@/lib/services";
import { zoneFixtures } from "@/lib/zones-fixtures";

type DynamicMapProps = {
  services: Service[];
  locations: Array<{ serviceId: string; coordinates: [number, number] | null }>;
  onSelect: (id: string) => void;
};

vi.mock("next/dynamic", () => ({
  default: () => function MockServicesMapCanvas({ services, locations, onSelect }: DynamicMapProps) {
    return (
      <div data-testid="services-map-canvas">
        {locations
          .filter((location) => location.coordinates !== null)
          .map((location) => (
            <button
              key={location.serviceId}
              type="button"
              onClick={() => onSelect(location.serviceId)}
            >
              {services.find((service) => service.id === location.serviceId)?.title}
            </button>
          ))}
      </div>
    );
  },
}));

const mapData: OperationalMapData = {
  containers: containerFixtures,
  greenPoints: greenPointFixtures,
  greenSpaces: [],
  trees: treeFixtures,
};
const zones = resolveOperationalZones(zoneFixtures);

function makeService(overrides: Partial<Service>): Service {
  return {
    id: "SVC-TEST",
    serviceTypeId: "st-test",
    serviceTypeName: "Servicio de prueba",
    title: "Servicio de prueba",
    mode: "POINT",
    status: "SCHEDULED",
    statusReason: null,
    origin: "MANUAL",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    targetType: null,
    targetId: null,
    targetRef: null,
    routeId: null,
    routeName: null,
    scheduledDate: "2026-09-11",
    windowFrom: "08:00",
    windowTo: "10:00",
    crewId: null,
    crewName: null,
    vehicleId: null,
    vehiclePlate: null,
    ticketId: null,
    notes: null,
    coordinates: { x: 50, y: 50 },
    attachments: [],
    history: [],
    ...overrides,
  };
}

describe("MapView", () => {
  beforeEach(() => {
    vi.spyOn(operationalMapAdapter, "load").mockResolvedValue(mapData);
    vi.spyOn(operationalZonesAdapter, "list").mockResolvedValue(zones);
  });

  it("shows resolved services without covering the map with location notices", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const services = [
      makeService({ id: "SVC-TREE-1", title: "Servicio arbóreo", targetType: "TREE", targetId: "tree-1" }),
      makeService({ id: "SVC-ROUTE-1", title: "Servicio de recorrido", mode: "ROUTE" }),
      makeService({ id: "SVC-NO-LOCATION", title: "Servicio sin ubicación", targetType: "TREE", targetId: "tree-does-not-exist" }),
    ];

    render(<MapView services={services} selectedId={null} onSelect={onSelect} />);

    expect(await screen.findByTestId("services-map-canvas")).toBeVisible();
    expect(screen.queryByText(/servicios? visibles|sin ubicación/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Servicio arbóreo" }));

    expect(onSelect).toHaveBeenCalledWith("SVC-TREE-1");
  });

  it("omits a service whose zone cannot be verified from the map", async () => {
    const services = [
      makeService({ id: "SVC-UNVERIFIED", title: "Servicio sin zona", zoneIds: ["zone-does-not-exist"], targetType: "TREE", targetId: "tree-1" }),
    ];

    render(<MapView services={services} selectedId="SVC-UNVERIFIED" onSelect={vi.fn()} />);

    expect(await screen.findByTestId("services-map-canvas")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Servicio sin zona" })).not.toBeInTheDocument();
    expect(screen.queryByText(/sin ubicación|no pudo verificarse/i)).not.toBeInTheDocument();
  });

  it("distinguishes an empty filtered map and lets the user clear filters", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <MapView
        services={[]}
        selectedId={null}
        onSelect={vi.fn()}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />,
    );

    expect(await screen.findByText("No hay servicios que coincidan con los filtros aplicados")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("keeps the map retry action when territorial data fails", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const mapLoad = vi
      .spyOn(operationalMapAdapter, "load")
      .mockRejectedValueOnce(new Error("territorial data unavailable"))
      .mockResolvedValue(mapData);

    render(
      <MapView
        services={[makeService({ id: "SVC-TREE-1", targetType: "TREE", targetId: "tree-1" })]}
        selectedId={null}
        onSelect={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el mapa");

    await user.click(screen.getByRole("button", { name: "Reintentar mapa" }));

    expect(onRetry).toHaveBeenCalledOnce();
    await waitFor(() => expect(mapLoad).toHaveBeenCalledTimes(2));
  });
});
