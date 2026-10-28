import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { containerFixtures } from "./containers-fixtures";
import { greenPointFixtures } from "./green-point-fixtures";
import { greenSpaceFixtures } from "./green-space-fixtures";
import {
  getOperationalZoneGeometries,
  isCoordinateInsideOperationalZone,
  parseOperationalZoneGeoJson,
  routeToStopOverlays,
  zoneGeometryCode,
  safeParseOperationalZoneGeoJson,
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
  it("ships the boundaries of the eight operational zones of the demo seed", () => {
    expect(new Set(getOperationalZoneGeometries().map((geometry) => geometry.code))).toEqual(
      new Set(["belgrano", "colegiales", "montserrat", "palermo", "puerto-madero", "recoleta", "retiro", "san-nicolas"]),
    );
  });

  it("matches every boundary to a zone fixture through the M9 neighborhood codigo", () => {
    const zoneCodes = new Set(zoneFixtures.filter((zone) => zone.active).map(zoneGeometryCode));
    for (const geometry of getOperationalZoneGeometries()) expect(zoneCodes, geometry.code).toContain(geometry.code);
  });

  it("gives every boundary a swatch class in the map stylesheet, so no zone renders unstyled", () => {
    const css = readFileSync("src/components/map/mapa-operativo.module.css", "utf8");
    for (const geometry of getOperationalZoneGeometries()) {
      expect(css, geometry.code).toMatch(new RegExp(`^\\.${geometry.code}\\s*\\{`, "m"));
    }
  });

  it("derives the boundary code from the barrio name, not from the GeoJSON zoneCode", () => {
    const [geometry] = parseOperationalZoneGeoJson({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { id: 1, nombre: "San Nicolas", zoneCode: "Z-SNI", zoneName: "San Nicolás" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
      }],
    });

    expect(geometry?.code).toBe("san-nicolas");
  });

  it("keeps every located inventory fixture inside its assigned operational zone", () => {
    const zoneById = new Map(zoneFixtures.map((zone) => [zone.id, zone]));
    const geometryByCode = new Map(
      getOperationalZoneGeometries().map((geometry) => [geometry.code, geometry]),
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

  it("keeps every GeoJSON ring closed and preserves Puerto Madero's four dock holes", () => {
    const geometries = getOperationalZoneGeometries();
    const rings = geometries.flatMap((geometry) => geometry.coordinates.flatMap((polygon) => polygon));
    const puertoMadero = geometries.find((geometry) => geometry.code === "puerto-madero");

    expect(rings.length).toBeGreaterThan(0);
    for (const ring of rings) expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(puertoMadero?.coordinates).toHaveLength(1);
    expect(puertoMadero?.coordinates[0]).toHaveLength(5);
    expect(isCoordinateInsideOperationalZone([-34.6148330233, -58.3643844330], puertoMadero!)).toBe(false);
  });

  it("treats a belgrano boundary vertex as inside the operational zone", () => {
    const belgrano = getOperationalZoneGeometries().find((geometry) => geometry.code === "belgrano");
    const boundaryVertex = belgrano?.coordinates[0]?.[0]?.[0];

    expect(boundaryVertex).toBeDefined();
    expect(isCoordinateInsideOperationalZone(boundaryVertex!, belgrano!)).toBe(true);
  });

  it("parses Polygon and MultiPolygon parts and checks containment across their union", () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1, nombre: "Multi", zoneCode: "Z-MULTI", zoneName: "Multi" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [[[-58.01, -34.01], [-58, -34.01], [-58, -34], [-58.01, -34], [-58.01, -34.01]]],
              [[[-58.2, -34.2], [-57.8, -34.2], [-57.8, -33.8], [-58.2, -33.8], [-58.2, -34.2]]],
            ],
          },
        },
      ],
    };
    const [geometry] = parseOperationalZoneGeoJson(geoJson);

    expect(geometry?.coordinates).toHaveLength(2);
    expect(isCoordinateInsideOperationalZone([-34.005, -58.005], geometry!)).toBe(true);
    expect(isCoordinateInsideOperationalZone([-34, -58], geometry!)).toBe(true);
    expect(isCoordinateInsideOperationalZone([-34.5, -58.5], geometry!)).toBe(false);
    expect(geometry?.center[0]).toBeCloseTo(-34, 6);
    expect(geometry?.center[1]).toBeCloseTo(-58, 6);
  });

  it("safely rejects malformed GeoJSON and logs when parsing disables overlays", () => {
    const unclosedGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1, nombre: "Open", zoneCode: "Z-OPEN", zoneName: "Open" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-58, -34], [-57, -34], [-57, -33], [-58, -33]]],
          },
        },
      ],
    };
    const invalidGeoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1, nombre: "Invalid", zoneCode: "Z-INVALID", zoneName: "Invalid" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-181, -34], [-58, -34], [-58, -33], [-181, -34]]],
          },
        },
      ],
    };
    const altitudeGeoJson = {
      ...invalidGeoJson,
      features: [
        {
          ...invalidGeoJson.features[0],
          geometry: {
            type: "Polygon",
            coordinates: [[[-58, -34, 10], [-57, -34], [-57, -33], [-58, -34, 10]]],
          },
        },
      ],
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      expect(safeParseOperationalZoneGeoJson(unclosedGeoJson).success).toBe(false);
      expect(safeParseOperationalZoneGeoJson(invalidGeoJson).success).toBe(false);
      expect(safeParseOperationalZoneGeoJson(altitudeGeoJson).success).toBe(false);
      let parsed: ReturnType<typeof parseOperationalZoneGeoJson> | undefined;
      expect(() => {
        parsed = parseOperationalZoneGeoJson(invalidGeoJson);
      }).not.toThrow();
      expect(parsed).toEqual([]);
      expect(errorSpy).toHaveBeenCalledOnce();
    } finally {
      errorSpy.mockRestore();
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
            sequence: 1,
            zoneId: "zone-1",
            estimatedDurationMin: 20,
            zoneCode: "Z-01",
            zoneName: "Zona Norte",
          },
        ],
      },
      zoneFixtures,
    );

    expect(overlay).toMatchObject({
      zoneCode: "belgrano",
      zoneName: "Belgrano",
      geometry: { code: "belgrano", name: "Belgrano" },
    });
  });
});
