import type { GreenPoint, GreenPointQuery } from "./green-points";

const INITIAL_GREEN_POINTS: GreenPoint[] = [
  { id: "green-point-1", code: "GP-001", name: "Punto verde Plaza Mitre", zoneId: "zone-1", wasteTypes: ["RECYCLABLE", "GREEN"], address: "Av. Cabildo 2100", lat: -34.5621, lng: -58.4561, active: true },
  { id: "green-point-2", code: "GP-002", name: "Punto verde Parque del Bicentenario", zoneId: "zone-2", wasteTypes: ["HOUSEHOLD", "RECYCLABLE", "BULKY"], address: "Av. Figueroa Alcorta 5000", lat: -34.5691, lng: -58.4053, active: true },
  { id: "green-point-3", code: "GP-003", name: "Punto verde Estación Sur", zoneId: "zone-3", wasteTypes: ["RECYCLABLE", "MIXED"], address: "Av. Pueyrredón 1800", lat: -34.5881, lng: -58.3971, active: false },
];

export const greenPointFixtures: GreenPoint[] = structuredClone(INITIAL_GREEN_POINTS);

export function resetGreenPointFixtures() {
  greenPointFixtures.splice(0, greenPointFixtures.length, ...structuredClone(INITIAL_GREEN_POINTS));
}

export function filterGreenPointFixtures(query: GreenPointQuery): GreenPoint[] {
  return greenPointFixtures.filter((item) => {
    if (query.active !== undefined && item.active !== query.active) return false;
    if (query.zoneId && item.zoneId !== query.zoneId) return false;
    if (query.wasteType && !item.wasteTypes.includes(query.wasteType)) return false;
    if (query.search && !`${item.name} ${item.address ?? ""}`.toLowerCase().includes(query.search.toLowerCase())) return false;
    return true;
  });
}

export function paginateGreenPointFixtures(items: GreenPoint[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } };
}

export function addGreenPointFixture(item: GreenPoint) {
  greenPointFixtures.push(item);
}

export function updateGreenPointFixture(id: string, changes: Partial<GreenPoint>): GreenPoint | null {
  const index = greenPointFixtures.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const current = greenPointFixtures[index];
  if (!current) return null;
  const { code: _immutableCode, id: _immutableId, ...editableChanges } = changes;
  const updated = { ...current, ...editableChanges };
  greenPointFixtures[index] = updated;
  return updated;
}
