import { describe, expect, it } from "vitest";

import { containerFixtures } from "./containers-fixtures";
import { greenPointFixtures } from "./green-point-fixtures";
import { resolveOperationalZones } from "./operational-zones";
import { resolveServiceMapLocations } from "./services-map";
import { treeFixtures } from "./tree-fixtures";
import type { Service } from "./services";
import { zoneFixtures } from "./zones-fixtures";

const mapData = {
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
});
