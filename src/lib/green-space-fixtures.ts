import type { GreenSpace, GreenSpaceQuery } from "./green-spaces";

export const greenSpaceFixtures: GreenSpace[] = [
  { id: "green-space-108-1", name: "Parque del Bicentenario", spaceType: "PARK", areaM2: 18500, zoneId: "zone-1", lat: -34.5692, lng: -58.4051, active: true },
  { id: "green-space-108-2", name: "Rambla Costera", spaceType: "PROMENADE", areaM2: 920, zoneId: "zone-2", lat: -34.5768, lng: -58.3974, active: true },
  { id: "green-space-108-3", name: "Plaza de las Artes", spaceType: "SQUARE", areaM2: 3600, zoneId: "zone-1", lat: -34.5844, lng: -58.4123, active: false },
  { id: "green-space-108-4", name: "Cantero Central", spaceType: "PLANTER", areaM2: 180, zoneId: "zone-2", lat: null, lng: null, active: true },
];

export function filterGreenSpaceFixtures(query: GreenSpaceQuery): GreenSpace[] {
  return greenSpaceFixtures.filter((greenSpace) => {
    if (query.active !== undefined && greenSpace.active !== query.active) return false;
    if (query.spaceType && greenSpace.spaceType !== query.spaceType) return false;
    if (query.zoneId && greenSpace.zoneId !== query.zoneId) return false;
    return true;
  });
}
export function paginateGreenSpaceFixtures(greenSpaces: GreenSpace[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: greenSpaces.slice(start, start + pageSize),
    meta: {
      total: greenSpaces.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(greenSpaces.length / pageSize)),
    },
  };
}

export function addGreenSpaceFixture(greenSpace: GreenSpace) {
  greenSpaceFixtures.push(greenSpace);
}
