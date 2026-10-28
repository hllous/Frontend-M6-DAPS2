import catalog from "@/data/m9-neighborhoods.json";

import type { Neighborhood } from "./neighborhoods";
import type { Zone, ZoneQuery, ZoneReferenceReport } from "./zones";

/** UUID determinístico de comuna (mismo formato que el ejemplo del backend). */
export function communeFixtureId(number: number): string {
  return `c0a80101-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

// Una zona por barrio, como el seed del backend (48 zonas, `code` = `codigo` del barrio, 15 comunas).
// Las primeras ocho conservan los ids `zone-1`..`zone-8` que usan las demás fixtures (recorridos, inventario).
const LEGACY_ZONE_ORDER = ["belgrano", "palermo", "recoleta", "retiro", "colegiales", "san-nicolas", "puerto-madero", "montserrat"];
const ZONE_NAME_OVERRIDES: Record<string, string> = { "san-nicolas": "San Nicolás", montserrat: "Montserrat", nunez: "Núñez" };

const activeNeighborhoods = (catalog as Neighborhood[]).filter((neighborhood) => neighborhood.activo);
const orderedNeighborhoods = [
  ...LEGACY_ZONE_ORDER.map((codigo) => activeNeighborhoods.find((neighborhood) => neighborhood.codigo === codigo)!),
  ...activeNeighborhoods.filter((neighborhood) => !LEGACY_ZONE_ORDER.includes(neighborhood.codigo)),
];

const INITIAL_ZONE_FIXTURES: Zone[] = orderedNeighborhoods.map((neighborhood, index) => ({
  id: `zone-${index + 1}`,
  code: neighborhood.codigo,
  name: ZONE_NAME_OVERRIDES[neighborhood.codigo] ?? neighborhood.nombre,
  active: true,
  commune: {
    id: communeFixtureId(Number(neighborhood.zona.replace("comuna-", ""))),
    code: neighborhood.zona,
    name: neighborhood.zonaNombre,
  },
  neighborhood: { id: neighborhood.id, codigo: neighborhood.codigo, nombre: neighborhood.nombre },
  neighborhoodIds: [neighborhood.id],
}));

export let zoneFixtures: Zone[] = INITIAL_ZONE_FIXTURES.map((item) => ({ ...item }));

export function resetZoneFixtures() {
  zoneFixtures = INITIAL_ZONE_FIXTURES.map((item) => ({ ...item }));
}

export function addZoneFixture(zone: Zone) {
  zoneFixtures.push(zone);
}

export function updateZoneFixture(id: string, patch: Partial<Zone>): Zone | null {
  const index = zoneFixtures.findIndex((candidate) => candidate.id === id);
  if (index === -1) return null;
  // Code is immutable per contract
  const { code: _ignored, ...allowedPatch } = patch;
  const current = zoneFixtures[index];
  if (!current) return null;
  const updated: Zone = {
    ...current,
    ...allowedPatch,
  };
  zoneFixtures[index] = updated;
  return updated;
}

/** Comuna del seed por id, o null si no existe (el backend responde 400 en ese caso). */
export function findCommuneFixture(communeId: string): Zone["commune"] {
  return INITIAL_ZONE_FIXTURES.find((zone) => zone.commune?.id === communeId)?.commune ?? null;
}

export function getZoneFixture(id: string): Zone | null {
  return zoneFixtures.find((candidate) => candidate.id === id) ?? null;
}

export function assignNeighborhoodsFixture(id: string, neighborhoodIds: string[]): Zone | null {
  const zone = getZoneFixture(id);
  if (!zone) return null;

  return updateZoneFixture(id, {
    neighborhoodIds: [...new Set([...(zone.neighborhoodIds ?? []), ...neighborhoodIds])],
  });
}

export function removeNeighborhoodFixture(id: string, neighborhoodId: string): Zone | null {
  const zone = getZoneFixture(id);
  if (!zone || !zone.neighborhoodIds?.includes(neighborhoodId)) return null;

  return updateZoneFixture(id, {
    neighborhoodIds: (zone.neighborhoodIds ?? []).filter((candidate) => candidate !== neighborhoodId),
  });
}

export const EMPTY_ZONES_QUERY: ZoneQuery = { search: "zzz-sin-resultados" };

export function filterZoneFixtures(query: ZoneQuery): Zone[] {
  return zoneFixtures.filter((zone) => {
    if (query.active !== undefined && zone.active !== query.active) return false;
    if (query.communeId && zone.commune?.id !== query.communeId) return false;
    if (query.search && !zone.name.toLowerCase().includes(query.search.toLowerCase())) return false;
    return true;
  });
}

export function paginateZoneFixtures(zones: Zone[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const data = zones.slice(start, start + pageSize);
  return {
    data,
    meta: {
      total: zones.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(zones.length / pageSize)),
    },
  };
}

/**
 * References check fixture data:
 * Simulates active routes, containers, trees, and green spaces referencing a zone.
 * Backend performs no referential integrity check on DELETE, so the frontend
 * uses this to warn the operator before deactivating.
 */
export function getZoneReferences(zoneId: string): ZoneReferenceReport {
  if (zoneId === "zone-1") {
    return {
      zoneId,
      activeRoutes: [
        { id: "route-1", code: "R-01", name: "Recorrido Norte Residencial" },
      ],
      containersCount: 3,
      treesCount: 12,
      greenSpacesCount: 2,
      totalReferences: 1 + 3 + 12 + 2,
    };
  }

  if (zoneId === "zone-2") {
    return {
      zoneId,
      activeRoutes: [
        { id: "route-2", code: "R-02", name: "Recorrido Sur Comercial" },
      ],
      containersCount: 1,
      treesCount: 4,
      greenSpacesCount: 1,
      totalReferences: 1 + 1 + 4 + 1,
    };
  }

  return {
    zoneId,
    activeRoutes: [],
    containersCount: 0,
    treesCount: 0,
    greenSpacesCount: 0,
    totalReferences: 0,
  };
}
