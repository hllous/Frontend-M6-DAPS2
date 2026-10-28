import catalog from "@/data/m9-neighborhoods.json";

import type { Commune } from "./communes";
import { neighborhoodSchema, type Neighborhood, type NeighborhoodQuery } from "./neighborhoods";
import { zoneFixtures } from "./zones-fixtures";

/** Copia del catálogo que M9 carga hoy: 64 barrios, 48 reales (activos) y 16 ficticios dados de baja. */
export const neighborhoodFixtures: Neighborhood[] = neighborhoodSchema.array().parse(catalog);

export function filterNeighborhoodFixtures(query: NeighborhoodQuery = {}): Neighborhood[] {
  const search = (query.q ?? "").trim().toLowerCase();
  return neighborhoodFixtures.filter(
    (neighborhood) =>
      (!query.soloActivos || neighborhood.activo) &&
      (!query.zona || neighborhood.zona === query.zona) &&
      (!search || `${neighborhood.codigo} ${neighborhood.nombre}`.toLowerCase().includes(search)),
  );
}

/** Comunas con sus zonas y barrios, en orden numérico, como `GET /communes`. */
export function communeFixtures(active?: boolean): Commune[] {
  const communes = new Map<number, Commune>();
  for (const zone of zoneFixtures) {
    if (!zone.commune) continue;
    const number = Number(zone.commune.code.replace("comuna-", ""));
    const commune = communes.get(number) ?? { ...zone.commune, active: true, zones: [] };
    commune.zones.push({
      id: zone.id,
      code: zone.code,
      name: zone.name,
      neighborhoods: zone.neighborhood ? [zone.neighborhood] : [],
    });
    communes.set(number, commune);
  }
  return [...communes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, commune]) => commune)
    .filter((commune) => active === undefined || commune.active === active);
}
