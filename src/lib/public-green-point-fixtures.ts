import type { PublicGreenPoint, PublicGreenPointsPage } from "./public-green-points";
import { publicZoneFixtures } from "./public-service-fixtures";

const centro = publicZoneFixtures[0]!;
const norte = publicZoneFixtures[1]!;
const sur = publicZoneFixtures[2]!;

export const publicGreenPointFixtures: readonly PublicGreenPoint[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    code: "PV-CEN-01",
    name: "Punto verde Plaza Mitre",
    address: "Av. Cabildo 2100",
    lat: -34.5621,
    lng: -58.4561,
    zoneName: centro.name,
    wasteTypes: ["RECYCLABLE", "GREEN"],
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    code: "PV-CEN-02",
    name: "Punto verde Estación Centro",
    address: "Av. de Mayo 1200",
    zoneName: centro.name,
    wasteTypes: ["HOUSEHOLD", "RECYCLABLE"],
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    code: "PV-NOR-01",
    name: "Punto verde Parque del Bicentenario",
    address: "Av. Figueroa Alcorta 5000",
    lat: -34.5691,
    lng: -58.4053,
    zoneName: norte.name,
    wasteTypes: ["HOUSEHOLD", "RECYCLABLE", "BULKY"],
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    code: "PV-SUR-01",
    name: "Punto verde Estación Sur",
    address: "Av. Pueyrredón 1800",
    lat: -34.5881,
    lng: -58.3971,
    zoneName: sur.name,
    wasteTypes: ["RECYCLABLE", "MIXED"],
  },
];

export type PublicGreenPointsFixtureQuery = { zoneId?: string; page?: number; pageSize?: number };

/** Imita el filtro por zona y la paginación del endpoint público. */
export function queryPublicGreenPointFixtures(query: PublicGreenPointsFixtureQuery): PublicGreenPointsPage {
  const zone = publicZoneFixtures.find((candidate) => candidate.id === query.zoneId);
  const matching = publicGreenPointFixtures.filter((point) => !query.zoneId || (zone && point.zoneName === zone.name));
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return {
    data: matching.slice((page - 1) * pageSize, page * pageSize),
    meta: { total: matching.length, page, pageSize, totalPages: Math.max(1, Math.ceil(matching.length / pageSize)) },
  };
}
