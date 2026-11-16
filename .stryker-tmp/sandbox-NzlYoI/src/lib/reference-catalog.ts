// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  zones: {
    item: Zone;
    query: Omit<ZoneQuery, "page" | "pageSize">;
  };
  crews: {
    item: Crew;
    query: Omit<CrewQuery, "page" | "pageSize">;
  };
  vehicles: {
    item: Vehicle;
    query: Omit<VehicleQuery, "page" | "pageSize">;
  };
  routes: {
    item: Route;
    query: Omit<RouteQuery, "page" | "pageSize">;
  };
  serviceTypes: {
    item: ServiceType;
    query: Omit<ServiceTypeQuery, "page" | "pageSize">;
  };
};
export type ReferenceItem<K extends ReferenceKind> = ReferenceTypes[K]["item"];
export type ReferenceQuery<K extends ReferenceKind> = ReferenceTypes[K]["query"];

/** Texto legible para una referencia que no se pudo resolver. */
export const REFERENCE_UNAVAILABLE: Record<ReferenceKind | "trees", string> = stryMutAct_9fa48("12622") ? {} : (stryCov_9fa48("12622"), {
  zones: stryMutAct_9fa48("12623") ? "" : (stryCov_9fa48("12623"), "Zona no disponible"),
  crews: stryMutAct_9fa48("12624") ? "" : (stryCov_9fa48("12624"), "Cuadrilla no disponible"),
  vehicles: stryMutAct_9fa48("12625") ? "" : (stryCov_9fa48("12625"), "Vehículo no disponible"),
  routes: stryMutAct_9fa48("12626") ? "" : (stryCov_9fa48("12626"), "Recorrido no disponible"),
  serviceTypes: stryMutAct_9fa48("12627") ? "" : (stryCov_9fa48("12627"), "Tipo de servicio no disponible"),
  trees: stryMutAct_9fa48("12628") ? "" : (stryCov_9fa48("12628"), "Árbol no disponible")
});
const PAGE_CONCURRENCY = 6;
type Page<T> = {
  items: T[];
  totalPages: number;
};

/** Recorre todas las páginas de un listado paginado: la primera dice cuántas faltan y el resto se pide en paralelo. */
export async function loadAllPages<T>(fetchPage: (page: number, pageSize: number) => Promise<Page<T>>): Promise<T[]> {
  if (stryMutAct_9fa48("12629")) {
    {}
  } else {
    stryCov_9fa48("12629");
    const first = await fetchPage(1, MAX_PAGE_SIZE);
    const remaining = await mapWithConcurrency(Array.from(stryMutAct_9fa48("12630") ? {} : (stryCov_9fa48("12630"), {
      length: stryMutAct_9fa48("12631") ? Math.min(0, first.totalPages - 1) : (stryCov_9fa48("12631"), Math.max(0, stryMutAct_9fa48("12632") ? first.totalPages + 1 : (stryCov_9fa48("12632"), first.totalPages - 1)))
    }), stryMutAct_9fa48("12633") ? () => undefined : (stryCov_9fa48("12633"), (_, index) => stryMutAct_9fa48("12634") ? index - 2 : (stryCov_9fa48("12634"), index + 2))), PAGE_CONCURRENCY, stryMutAct_9fa48("12635") ? () => undefined : (stryCov_9fa48("12635"), page => fetchPage(page, MAX_PAGE_SIZE)));
    return stryMutAct_9fa48("12636") ? [] : (stryCov_9fa48("12636"), [...first.items, ...remaining.flatMap(stryMutAct_9fa48("12637") ? () => undefined : (stryCov_9fa48("12637"), page => page.items))]);
  }
}
const loaders: { [K in ReferenceKind]: (query: ReferenceQuery<K>) => Promise<ReferenceItem<K>[]> } = stryMutAct_9fa48("12638") ? {} : (stryCov_9fa48("12638"), {
  zones: stryMutAct_9fa48("12639") ? () => undefined : (stryCov_9fa48("12639"), async query => sortZonesByCommune(await loadAllPages(stryMutAct_9fa48("12640") ? () => undefined : (stryCov_9fa48("12640"), (page, pageSize) => zonesAdapter.list(stryMutAct_9fa48("12641") ? {} : (stryCov_9fa48("12641"), {
    ...query,
    page,
    pageSize
  })).then(stryMutAct_9fa48("12642") ? () => undefined : (stryCov_9fa48("12642"), result => stryMutAct_9fa48("12643") ? {} : (stryCov_9fa48("12643"), {
    items: result.zones,
    totalPages: result.totalPages
  }))))))),
  crews: stryMutAct_9fa48("12644") ? () => undefined : (stryCov_9fa48("12644"), query => loadAllPages(stryMutAct_9fa48("12645") ? () => undefined : (stryCov_9fa48("12645"), (page, pageSize) => crewsAdapter.list(stryMutAct_9fa48("12646") ? {} : (stryCov_9fa48("12646"), {
    ...query,
    page,
    pageSize
  })).then(stryMutAct_9fa48("12647") ? () => undefined : (stryCov_9fa48("12647"), result => stryMutAct_9fa48("12648") ? {} : (stryCov_9fa48("12648"), {
    items: result.crews,
    totalPages: result.totalPages
  })))))),
  vehicles: stryMutAct_9fa48("12649") ? () => undefined : (stryCov_9fa48("12649"), query => loadAllPages(stryMutAct_9fa48("12650") ? () => undefined : (stryCov_9fa48("12650"), (page, pageSize) => vehiclesAdapter.list(stryMutAct_9fa48("12651") ? {} : (stryCov_9fa48("12651"), {
    ...query,
    page,
    pageSize
  })).then(stryMutAct_9fa48("12652") ? () => undefined : (stryCov_9fa48("12652"), result => stryMutAct_9fa48("12653") ? {} : (stryCov_9fa48("12653"), {
    items: result.vehicles,
    totalPages: result.totalPages
  })))))),
  routes: stryMutAct_9fa48("12654") ? () => undefined : (stryCov_9fa48("12654"), query => loadAllPages(stryMutAct_9fa48("12655") ? () => undefined : (stryCov_9fa48("12655"), (page, pageSize) => routesAdapter.list(stryMutAct_9fa48("12656") ? {} : (stryCov_9fa48("12656"), {
    ...query,
    page,
    pageSize
  })).then(stryMutAct_9fa48("12657") ? () => undefined : (stryCov_9fa48("12657"), result => stryMutAct_9fa48("12658") ? {} : (stryCov_9fa48("12658"), {
    items: result.routes,
    totalPages: result.totalPages
  })))))),
  serviceTypes: stryMutAct_9fa48("12659") ? () => undefined : (stryCov_9fa48("12659"), query => loadAllPages(stryMutAct_9fa48("12660") ? () => undefined : (stryCov_9fa48("12660"), (page, pageSize) => serviceTypesAdapter.list(stryMutAct_9fa48("12661") ? {} : (stryCov_9fa48("12661"), {
    ...query,
    page,
    pageSize
  })).then(stryMutAct_9fa48("12662") ? () => undefined : (stryCov_9fa48("12662"), result => stryMutAct_9fa48("12663") ? {} : (stryCov_9fa48("12663"), {
    items: result.serviceTypes,
    totalPages: result.totalPages
  }))))))
});

/** Catálogo completo de un tipo de referencia (todas las páginas). Las Zones vienen ordenadas por Commune. */
export function loadReferenceCatalog<K extends ReferenceKind>(kind: K, query: ReferenceQuery<K> = {} as ReferenceQuery<K>): Promise<ReferenceItem<K>[]> {
  if (stryMutAct_9fa48("12664")) {
    {}
  } else {
    stryCov_9fa48("12664");
    return (loaders[kind] as (query: ReferenceQuery<K>) => Promise<ReferenceItem<K>[]>)(query);
  }
}

/** Nombre visible de una referencia ya cargada. */
export function referenceName<K extends ReferenceKind>(kind: K, item: ReferenceItem<K>): string {
  if (stryMutAct_9fa48("12665")) {
    {}
  } else {
    stryCov_9fa48("12665");
    if (stryMutAct_9fa48("12668") ? kind !== "vehicles" : stryMutAct_9fa48("12667") ? false : stryMutAct_9fa48("12666") ? true : (stryCov_9fa48("12666", "12667", "12668"), kind === (stryMutAct_9fa48("12669") ? "" : (stryCov_9fa48("12669"), "vehicles")))) return (item as Vehicle).plate;
    return (item as Zone | Crew | Route | ServiceType).name;
  }
}

/** Nombre visible de un árbol: código ARB y especie. */
export function treeReferenceName(tree: Pick<Tree, "surveyCode" | "species">): string {
  if (stryMutAct_9fa48("12670")) {
    {}
  } else {
    stryCov_9fa48("12670");
    return stryMutAct_9fa48("12671") ? `` : (stryCov_9fa48("12671"), `${tree.surveyCode} · ${stryMutAct_9fa48("12672") ? tree.species && "Especie no registrada" : (stryCov_9fa48("12672"), tree.species ?? (stryMutAct_9fa48("12673") ? "" : (stryCov_9fa48("12673"), "Especie no registrada")))}`);
  }
}
const TREE_LOOKUP_CONCURRENCY = 4;

/**
 * Árboles por id, de a uno y con concurrencia acotada: alcanza con resolver los que se muestran en lugar de traer
 * todo el censo. Un árbol que no existe (o que falla) queda fuera del mapa y se muestra como no disponible.
 */
export async function loadTreeReferences(ids: readonly string[]): Promise<Map<string, Tree>> {
  if (stryMutAct_9fa48("12674")) {
    {}
  } else {
    stryCov_9fa48("12674");
    const {
      treesAdapter
    } = await import("./trees");
    const unique = stryMutAct_9fa48("12675") ? [] : (stryCov_9fa48("12675"), [...new Set(ids)]);
    const found = await mapWithConcurrency(unique, TREE_LOOKUP_CONCURRENCY, stryMutAct_9fa48("12676") ? () => undefined : (stryCov_9fa48("12676"), id => treesAdapter.get(encodeURIComponent(id)).catch(stryMutAct_9fa48("12677") ? () => undefined : (stryCov_9fa48("12677"), () => null))));
    return new Map(stryMutAct_9fa48("12678") ? found.map(tree => [tree.id, tree]) : (stryCov_9fa48("12678"), found.filter(stryMutAct_9fa48("12679") ? () => undefined : (stryCov_9fa48("12679"), (tree): tree is Tree => stryMutAct_9fa48("12682") ? tree === null : stryMutAct_9fa48("12681") ? false : stryMutAct_9fa48("12680") ? true : (stryCov_9fa48("12680", "12681", "12682"), tree !== null))).map(stryMutAct_9fa48("12683") ? () => undefined : (stryCov_9fa48("12683"), tree => stryMutAct_9fa48("12684") ? [] : (stryCov_9fa48("12684"), [tree.id, tree])))));
  }
}