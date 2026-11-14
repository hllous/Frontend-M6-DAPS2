import { crewsAdapter, type Crew, type CrewQuery } from "./crews";
import { MAX_PAGE_SIZE } from "./input-limits";
import { mapWithConcurrency } from "./map-concurrency";
import { routesAdapter, type Route, type RouteQuery } from "./routes";
import { serviceTypesAdapter, type ServiceType, type ServiceTypeQuery } from "./service-types";
import type { Tree } from "./trees";
import { vehiclesAdapter, type Vehicle, type VehicleQuery } from "./vehicles";
import { sortZonesByCommune, zonesAdapter, type Zone, type ZoneQuery } from "./zones";

/**
 * Resolvedor de referencias (#909). Una pantalla que muestra una Zone, una Crew, un vehículo, un recorrido o un
 * tipo de servicio por su id pide acá el catálogo completo, no la primera página: el lookup por id funciona sin
 * importar cuántos registros tenga el catálogo, y nunca devuelve un UUID como texto visible.
 */
export type ReferenceKind = "zones" | "crews" | "vehicles" | "routes" | "serviceTypes";

type ReferenceTypes = {
  zones: { item: Zone; query: Omit<ZoneQuery, "page" | "pageSize"> };
  crews: { item: Crew; query: Omit<CrewQuery, "page" | "pageSize"> };
  vehicles: { item: Vehicle; query: Omit<VehicleQuery, "page" | "pageSize"> };
  routes: { item: Route; query: Omit<RouteQuery, "page" | "pageSize"> };
  serviceTypes: { item: ServiceType; query: Omit<ServiceTypeQuery, "page" | "pageSize"> };
};

export type ReferenceItem<K extends ReferenceKind> = ReferenceTypes[K]["item"];
export type ReferenceQuery<K extends ReferenceKind> = ReferenceTypes[K]["query"];

/** Texto legible para una referencia que no se pudo resolver. */
export const REFERENCE_UNAVAILABLE: Record<ReferenceKind | "trees", string> = {
  zones: "Zona no disponible",
  crews: "Cuadrilla no disponible",
  vehicles: "Vehículo no disponible",
  routes: "Recorrido no disponible",
  serviceTypes: "Tipo de servicio no disponible",
  trees: "Árbol no disponible",
};

const PAGE_CONCURRENCY = 6;

type Page<T> = { items: T[]; totalPages: number };

/** Recorre todas las páginas de un listado paginado: la primera dice cuántas faltan y el resto se pide en paralelo. */
export async function loadAllPages<T>(fetchPage: (page: number, pageSize: number) => Promise<Page<T>>): Promise<T[]> {
  const first = await fetchPage(1, MAX_PAGE_SIZE);
  const remaining = await mapWithConcurrency(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => index + 2),
    PAGE_CONCURRENCY,
    (page) => fetchPage(page, MAX_PAGE_SIZE),
  );
  return [...first.items, ...remaining.flatMap((page) => page.items)];
}

const loaders: { [K in ReferenceKind]: (query: ReferenceQuery<K>) => Promise<ReferenceItem<K>[]> } = {
  zones: async (query) => sortZonesByCommune(await loadAllPages((page, pageSize) => zonesAdapter.list({ ...query, page, pageSize }).then((result) => ({ items: result.zones, totalPages: result.totalPages })))),
  crews: (query) => loadAllPages((page, pageSize) => crewsAdapter.list({ ...query, page, pageSize }).then((result) => ({ items: result.crews, totalPages: result.totalPages }))),
  vehicles: (query) => loadAllPages((page, pageSize) => vehiclesAdapter.list({ ...query, page, pageSize }).then((result) => ({ items: result.vehicles, totalPages: result.totalPages }))),
  routes: (query) => loadAllPages((page, pageSize) => routesAdapter.list({ ...query, page, pageSize }).then((result) => ({ items: result.routes, totalPages: result.totalPages }))),
  serviceTypes: (query) => loadAllPages((page, pageSize) => serviceTypesAdapter.list({ ...query, page, pageSize }).then((result) => ({ items: result.serviceTypes, totalPages: result.totalPages }))),
};

/** Catálogo completo de un tipo de referencia (todas las páginas). Las Zones vienen ordenadas por Commune. */
export function loadReferenceCatalog<K extends ReferenceKind>(kind: K, query: ReferenceQuery<K> = {} as ReferenceQuery<K>): Promise<ReferenceItem<K>[]> {
  return (loaders[kind] as (query: ReferenceQuery<K>) => Promise<ReferenceItem<K>[]>)(query);
}

/** Nombre visible de una referencia ya cargada. */
export function referenceName<K extends ReferenceKind>(kind: K, item: ReferenceItem<K>): string {
  if (kind === "vehicles") return (item as Vehicle).plate;
  return (item as Zone | Crew | Route | ServiceType).name;
}

/** Nombre visible de un árbol: código ARB y especie. */
export function treeReferenceName(tree: Pick<Tree, "surveyCode" | "species">): string {
  return `${tree.surveyCode} · ${tree.species ?? "Especie no registrada"}`;
}

const TREE_LOOKUP_CONCURRENCY = 4;

/**
 * Árboles por id, de a uno y con concurrencia acotada: alcanza con resolver los que se muestran en lugar de traer
 * todo el censo. Un árbol que no existe (o que falla) queda fuera del mapa y se muestra como no disponible.
 */
export async function loadTreeReferences(ids: readonly string[]): Promise<Map<string, Tree>> {
  const { treesAdapter } = await import("./trees");
  const unique = [...new Set(ids)];
  const found = await mapWithConcurrency(unique, TREE_LOOKUP_CONCURRENCY, (id) => treesAdapter.get(encodeURIComponent(id)).catch(() => null));
  return new Map(found.filter((tree): tree is Tree => tree !== null).map((tree) => [tree.id, tree]));
}
