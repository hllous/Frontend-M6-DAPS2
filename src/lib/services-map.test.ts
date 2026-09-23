import { describe, expect, it } from "vitest";

import { containerFixtures } from "./containers-fixtures";
import { greenPointFixtures } from "./green-point-fixtures";
import { greenSpaceFixtures } from "./green-space-fixtures";
import { resolveOperationalZones } from "./operational-zones";
import { resolveServiceMapLocations, summarizeServiceZones } from "./services-map";
import { treeFixtures } from "./tree-fixtures";
import type { Service } from "./services";
import { zoneFixtures } from "./zones-fixtures";

const mapData = {
  containers: containerFixtures,
  greenPoints: greenPointFixtures,
  greenSpaces: greenSpaceFixtures,
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

describe("resolveServiceMapLocations", () => {
  it("uses the POINT target catalog coordinates instead of the legacy percentage coordinates", () => {
    const service = makeService({
      id: "SVC-TREE-1",
      targetType: "TREE",
      targetId: "tree-1",
    });

    const [location] = resolveServiceMapLocations([service], mapData, zones);

    expect(location).toMatchObject({
      serviceId: "SVC-TREE-1",
      coordinates: [-34.5622, -58.4562],
      locationType: "point",
    });
  });

  it("resolves ROUTE geometry by canonical zone id, not the stale embedded zone name", () => {
    const service = makeService({
      id: "SVC-ROUTE-1",
      mode: "ROUTE",
      zoneIds: ["zone-1"],
      zoneNames: ["Zona Norte"],
      targetType: null,
      targetId: null,
    });

    const [location] = resolveServiceMapLocations([service], mapData, zones);

    expect(location?.locationType).toBe("route");
    expect(location?.zones).toHaveLength(1);
    expect(location?.zones[0]).toMatchObject({ zoneId: "zone-1", code: "Z-BEL", name: "Belgrano" });
    expect(location?.coordinates).toEqual(location?.zones[0]?.center);
  });

  it("leaves an unresolvable service without a fallback map coordinate", () => {
    const service = makeService({
      id: "SVC-NO-LOCATION",
      targetType: "TREE",
      targetId: "tree-does-not-exist",
    });

    const [location] = resolveServiceMapLocations([service], mapData, zones);

    expect(location).toMatchObject({
      serviceId: "SVC-NO-LOCATION",
      coordinates: null,
      locationType: "unresolved",
    });
  });

  it("resolves a GREEN_SPACE target with the green space coordinates and name", () => {
    const service = makeService({
      id: "SVC-GREEN-SPACE-1",
      targetType: "GREEN_SPACE",
      targetId: "green-space-108-1",
    });

    const [location] = resolveServiceMapLocations([service], mapData, zones);

    expect(location).toMatchObject({
      serviceId: "SVC-GREEN-SPACE-1",
      coordinates: [-34.5605, -58.4525],
      locationType: "point",
      locationLabel: "Parque del Bicentenario",
    });
  });
});

describe("new demo seed zones", () => {
  it("pins a point service in a zone added with the seven-barrio seed (Z-SNI)", () => {
    const obelisco = { id: "green-space-obelisco", name: "Plaza de la República", lat: -34.6037, lng: -58.3816 };
    const service = makeService({
      id: "SVC-SNI-1",
      zoneIds: ["zone-6"],
      zoneNames: ["San Nicolás"],
      targetType: "GREEN_SPACE",
      targetId: obelisco.id,
    });

    const [location] = resolveServiceMapLocations(
      [service],
      { ...mapData, greenSpaces: [{ ...obelisco, spaceType: "SQUARE", areaM2: null, zoneId: "zone-6", active: true }] },
      zones,
    );

    expect(location).toMatchObject({ coordinates: [-34.6037, -58.3816], locationType: "point" });
    expect(location?.zones[0]).toMatchObject({ code: "Z-SNI" });
  });
});

describe("summarizeServiceZones", () => {
  it("counts point and route services in the zone, once each", () => {
    const locations = resolveServiceMapLocations(
      [
        makeService({ id: "SVC-ROUTE-1", mode: "ROUTE", zoneIds: ["zone-1", "zone-2"] }),
        makeService({ id: "SVC-TREE-1", targetType: "TREE", targetId: "tree-1" }),
        makeService({ id: "SVC-GREEN-SPACE-1", targetType: "GREEN_SPACE", targetId: "green-space-108-1" }),
        makeService({ id: "SVC-POINT-PAL", zoneIds: ["zone-2"], zoneNames: ["Palermo"] }),
      ],
      mapData,
      zones,
    );

    const summaries = summarizeServiceZones(locations);
    const belgrano = summaries.find((summary) => summary.zone.code === "Z-BEL");
    const palermo = summaries.find((summary) => summary.zone.code === "Z-PAL");

    expect(belgrano).toMatchObject({
      hasRoute: true,
      serviceIds: ["SVC-ROUTE-1", "SVC-TREE-1", "SVC-GREEN-SPACE-1"],
    });
    expect(palermo).toMatchObject({ hasRoute: true, serviceIds: ["SVC-ROUTE-1", "SVC-POINT-PAL"] });
  });

  it("marks zones with only point services as not crossed by a route", () => {
    const locations = resolveServiceMapLocations(
      [makeService({ id: "SVC-TREE-1", targetType: "TREE", targetId: "tree-1" })],
      mapData,
      zones,
    );

    expect(summarizeServiceZones(locations)).toEqual([
      expect.objectContaining({ hasRoute: false, serviceIds: ["SVC-TREE-1"] }),
    ]);
  });
});
