import type { Zone, ZoneQuery, ZoneReferenceReport } from "./zones";

const INITIAL_ZONE_FIXTURES: Zone[] = [
  { id: "zone-1", code: "Z-BEL", name: "Belgrano", active: true, neighborhoodIds: ["barrio-1", "barrio-2"] },
  { id: "zone-2", code: "Z-PAL", name: "Palermo", active: true, neighborhoodIds: ["barrio-3"] },
  { id: "zone-3", code: "Z-REC", name: "Recoleta", active: true, neighborhoodIds: [] },
  { id: "zone-4", code: "Z-RET", name: "Retiro", active: true, neighborhoodIds: [] },
];

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

export function getZoneFixture(id: string): Zone | null {
  return zoneFixtures.find((candidate) => candidate.id === id) ?? null;
}

export function assignNeighborhoodsFixture(id: string, neighborhoodIds: string[]): Zone | null {
  const zone = getZoneFixture(id);
  if (!zone) return null;

  return updateZoneFixture(id, {
    neighborhoodIds: [...new Set([...zone.neighborhoodIds, ...neighborhoodIds])],
  });
}

export function removeNeighborhoodFixture(id: string, neighborhoodId: string): Zone | null {
  const zone = getZoneFixture(id);
  if (!zone || !zone.neighborhoodIds.includes(neighborhoodId)) return null;

  return updateZoneFixture(id, {
    neighborhoodIds: zone.neighborhoodIds.filter((candidate) => candidate !== neighborhoodId),
  });
}

export const EMPTY_ZONES_QUERY: ZoneQuery = { search: "zzz-sin-resultados" };

export function filterZoneFixtures(query: ZoneQuery): Zone[] {
  return zoneFixtures.filter((zone) => {
    if (query.active !== undefined && zone.active !== query.active) return false;
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
