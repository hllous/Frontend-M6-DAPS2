import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  barrioAt,
  barrioCodeFromName,
  buildMapBoundaries,
  hideAll,
  isFilterActive,
  isPointVisible,
  setBarrioVisible,
  setCommuneVisible,
  showAll,
} from "./map-boundaries";

const read = (name: string): unknown => JSON.parse(readFileSync(`public/geo/${name}.geojson`, "utf8"));
const communesGeoJson = read("comunas");
const barriosGeoJson = read("barrios");

const square = (south: number, west: number) => ({
  type: "Polygon",
  coordinates: [[[west, south], [west + 1, south], [west + 1, south + 1], [west, south + 1], [west, south]]],
});
const syntheticBarrios = {
  features: [
    { properties: { BARRIO: "ALFA", COMUNA: 1 }, geometry: square(0, 0) },
    { properties: { BARRIO: "BETA", COMUNA: 1 }, geometry: square(0, 2) },
    { properties: { BARRIO: "GAMA", COMUNA: 2 }, geometry: square(2, 0) },
  ],
};
const syntheticCommunes = {
  features: [
    { properties: { COMUNAS: 1 }, geometry: square(0, 0) },
    { properties: { COMUNAS: 2 }, geometry: square(2, 0) },
  ],
};

describe("barrioCodeFromName", () => {
  it("sluggifies and aliases the names that differ from the M9 codigo", () => {
    expect(barrioCodeFromName("NUÑEZ")).toBe("nunez");
    expect(barrioCodeFromName("BOCA")).toBe("la-boca");
    expect(barrioCodeFromName("PATERNAL")).toBe("la-paternal");
    expect(barrioCodeFromName("VILLA GRAL. MITRE")).toBe("villa-general-mitre");
  });
});

describe("buildMapBoundaries with the official CABA GeoJSON", () => {
  const boundaries = buildMapBoundaries(communesGeoJson, barriosGeoJson);

  it("loads the 15 communes and the 48 barrios, each barrio under its commune", () => {
    expect(boundaries.communes.map((commune) => commune.code)).toEqual(
      Array.from({ length: 15 }, (_, index) => `comuna-${index + 1}`),
    );
    expect(boundaries.barrios).toHaveLength(48);
    const palermo = boundaries.barrios.find((barrio) => barrio.code === "palermo");
    expect(palermo?.communeCode).toBe("comuna-14");
    expect(boundaries.barrios.every((barrio) => boundaries.communes.some((c) => c.code === barrio.communeCode))).toBe(true);
  });

  it("finds the barrio that contains a point", () => {
    expect(barrioAt(boundaries, [-34.5875, -58.4306])).toBe("palermo");
    expect(barrioAt(boundaries, [-34.0, -58.4])).toBeNull();
  });
});

describe("buildMapBoundaries catalog matching", () => {
  it("uses the API names and lists active API barrios that have no polygon without breaking", () => {
    const boundaries = buildMapBoundaries(syntheticCommunes, syntheticBarrios, {
      communes: [{ code: "comuna-1", name: "Comuna Uno" }],
      neighborhoods: [
        { codigo: "alfa", nombre: "Alfa API", zona: "comuna-1", activo: true },
        { codigo: "sin-mapa", nombre: "Sin mapa", zona: "comuna-2", activo: true },
        { codigo: "dado-de-baja", nombre: "Baja", zona: "comuna-2", activo: false },
        { codigo: "ficticio", nombre: "Ficticio", zona: "norte", activo: true },
      ],
    });

    expect(boundaries.communes.map((commune) => commune.name)).toEqual(["Comuna Uno", "Comuna 2"]);
    // Polygon without a barrio in the API keeps the GeoJSON name.
    expect(boundaries.barrios.map((barrio) => barrio.name)).toEqual(["Alfa API", "Beta", "Gama"]);
    expect(boundaries.barriosWithoutPolygon).toEqual([{ code: "sin-mapa", name: "Sin mapa", communeCode: "comuna-2" }]);
  });

  it("returns no layers when a GeoJSON is invalid", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(buildMapBoundaries({}, barriosGeoJson).communes).toEqual([]);
    error.mockRestore();
  });
});

describe("visibility", () => {
  const boundaries = buildMapBoundaries(syntheticCommunes, syntheticBarrios);

  it("does not filter when everything is visible", () => {
    const visibility = showAll(boundaries);
    expect(isFilterActive(boundaries, visibility)).toBe(false);
    expect(isPointVisible(boundaries, visibility, [50, 50])).toBe(true);
  });

  it("hiding a commune hides its barrios", () => {
    const visibility = setCommuneVisible(boundaries, showAll(boundaries), "comuna-1", false);
    expect([...visibility.communes]).toEqual(["comuna-2"]);
    expect([...visibility.barrios]).toEqual(["gama"]);
    expect(isPointVisible(boundaries, visibility, [0.5, 0.5])).toBe(false);
    expect(isPointVisible(boundaries, visibility, [2.5, 0.5])).toBe(true);
  });

  it("hide all + show one barrio leaves only the markers inside it, and the commune stays hidden", () => {
    const visibility = setBarrioVisible(hideAll(), "beta", true);
    expect(visibility.communes.size).toBe(0);
    expect(isPointVisible(boundaries, visibility, [0.5, 2.5])).toBe(true);
    expect(isPointVisible(boundaries, visibility, [0.5, 0.5])).toBe(false);
    expect(isPointVisible(boundaries, visibility, [50, 50])).toBe(false);
  });

  it("show all restores everything", () => {
    expect(isFilterActive(boundaries, showAll(boundaries))).toBe(false);
  });
});
