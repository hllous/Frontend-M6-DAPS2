import { describe, expect, it } from "vitest";

import { containerFixtures } from "./containers-fixtures";
import { greenPointFixtures } from "./green-point-fixtures";
import { greenSpaceFixtures } from "./green-space-fixtures";
import {
  isCoordinateInsideOperationalZone,
  operationalZoneGeometries,
  routeToStopOverlays,
} from "./operational-zones";
import { treeFixtures } from "./tree-fixtures";
import { zoneFixtures } from "./zones-fixtures";

type LocatedInventoryItem = {
  id: string;
  zoneId: string;
  lat: number | null;
  lng: number | null;
};

const inventoryFixtures: LocatedInventoryItem[] = [
  ...containerFixtures,
  ...greenPointFixtures,
  ...greenSpaceFixtures,
  ...treeFixtures,
];

describe("mock geodata", () => {
  it("uses the same canonical zone codes as the boundary GeoJSON", () => {
    expect(zoneFixtures.filter((zone) => zone.active).map((zone) => zone.code)).toEqual(
      operationalZoneGeometries.map((geometry) => geometry.code),
    );
  });

  it("keeps every located inventory fixture inside its assigned operational zone", () => {
    const zoneById = new Map(zoneFixtures.map((zone) => [zone.id, zone]));
    const geometryByCode = new Map(
      operationalZoneGeometries.map((geometry) => [geometry.code, geometry]),
    );

    for (const item of inventoryFixtures) {
      expect(item.lat, `${item.id} must have a latitude`).not.toBeNull();
      expect(item.lng, `${item.id} must have a longitude`).not.toBeNull();

      const zone = zoneById.get(item.zoneId);
      expect(zone, `${item.id} references an unknown zone`).toBeDefined();
      const geometry = geometryByCode.get(zone!.code);
      expect(geometry, `${item.id} references a zone without geometry`).toBeDefined();

      expect(item.lat).toBeGreaterThan(-35);
      expect(item.lat).toBeLessThan(-34);
      expect(item.lng).toBeGreaterThan(-59);
      expect(item.lng).toBeLessThan(-58);
      expect(
        isCoordinateInsideOperationalZone([item.lat!, item.lng!], geometry!),
        `${item.id} is outside ${zone!.code}`,
      ).toBe(true);
    }
  });

  it("resolves route stops through the current zone catalog before embedded snapshots", () => {
    const [overlay] = routeToStopOverlays(
      {
        id: "route-geodata-check",
        code: "REC-GEO",
        name: "Recorrido geográfico",
        active: true,
        stops: [
          {
            id: "stop-geodata-check",
            routeId: "route-geodata-check",
            sequence: 1,
            zoneId: "zone-1",
            estimatedDurationMin: 20,
            zone: { id: "zone-1", code: "Z-01", name: "Zona Norte" },
          },
        ],
      },
      zoneFixtures,
    );

    expect(overlay).toMatchObject({
      zoneCode: "Z-BEL",
      zoneName: "Belgrano",
      geometry: { code: "Z-BEL", name: "Belgrano" },
    });
  });
});
