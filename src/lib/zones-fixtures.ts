import type { Zone, ZoneQuery } from "./zones";

export const zoneFixtures: Zone[] = [
  { id: "zone-1", code: "Z-01", name: "Zona Norte", active: true, neighborhoodIds: ["barrio-1", "barrio-2"] },
  { id: "zone-2", code: "Z-02", name: "Zona Sur", active: true, neighborhoodIds: ["barrio-3"] },
  { id: "zone-3", code: "Z-03", name: "Zona Oeste", active: false, neighborhoodIds: [] },
];

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
