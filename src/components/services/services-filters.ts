import type { Service } from "@/lib/services";
import { communeNumber, sortZonesByCommune, type Zone } from "@/lib/zones";

import type { ColumnFilters } from "./services-table";

/** Un barrio (Zone de M6) de la lista "Comuna y barrio". */
export type ZoneOption = { id: string; name: string };
/** Una comuna con sus barrios. La comuna agrupa: elegirla elige todos sus barrios. */
export type ZoneGroup = { key: string; label: string; zones: ZoneOption[] };

const NO_COMMUNE_KEY = "sin-comuna";

export function emptyColumnFilters(): ColumnFilters {
  return { zones: new Set(), statuses: new Set(), crews: new Set(), timeFrom: "", timeTo: "" };
}

/** Agrupa las zonas activas por comuna (numérica), con las zonas sin comuna al final. */
export function buildZoneGroups(zones: Zone[]): ZoneGroup[] {
  const groups = new Map<string, ZoneGroup>();
  for (const zone of sortZonesByCommune(zones.filter((candidate) => candidate.active))) {
    const number = communeNumber(zone.commune);
    const key = zone.commune ? `comuna-${number ?? zone.commune.id}` : NO_COMMUNE_KEY;
    const group = groups.get(key) ?? {
      key,
      label: zone.commune ? zone.commune.name : "Sin comuna",
      zones: [],
    };
    group.zones.push({ id: zone.id, name: zone.name });
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Si no se pudo leer el catálogo de zonas, las zonas de los servicios cargados van en un solo grupo. */
export function zoneGroupsFromServices(services: Service[]): ZoneGroup[] {
  const zones = new Map<string, ZoneOption>();
  for (const service of services) {
    service.zoneIds.forEach((id, index) => {
      if (!zones.has(id)) zones.set(id, { id, name: service.zoneNames[index] ?? service.zoneNames[0] ?? "Zona" });
    });
  }
  if (zones.size === 0) return [];
  return [{
    key: NO_COMMUNE_KEY,
    label: "Zonas",
    zones: [...zones.values()].sort((a, b) => a.name.localeCompare(b.name, "es-AR")),
  }];
}

export type CommuneSelection = "all" | "some" | "none";

export function communeSelection(group: ZoneGroup, selected: ReadonlySet<string>): CommuneSelection {
  const count = group.zones.filter((zone) => selected.has(zone.id)).length;
  return count === 0 ? "none" : count === group.zones.length ? "all" : "some";
}

/** Marcar la comuna elige todos sus barrios; desmarcarla los quita. */
export function toggleCommune(selected: ReadonlySet<string>, group: ZoneGroup): Set<string> {
  const next = new Set(selected);
  const select = communeSelection(group, selected) !== "all";
  for (const zone of group.zones) {
    if (select) next.add(zone.id);
    else next.delete(zone.id);
  }
  return next;
}

export function toggleInSet<T>(selected: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(selected);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Cantidad de filtros distintos activos: cada filtro cuenta una vez, sin importar cuántas opciones tenga. */
export function countActiveFilters(search: string, filters: ColumnFilters): number {
  return [
    search.trim() !== "",
    filters.statuses.size > 0,
    filters.zones.size > 0,
    filters.crews.size > 0,
    filters.timeFrom !== "" || filters.timeTo !== "",
  ].filter(Boolean).length;
}

export function activeFiltersLabel(count: number): string {
  return count === 1 ? "1 filtro activo" : `${count} filtros activos`;
}
