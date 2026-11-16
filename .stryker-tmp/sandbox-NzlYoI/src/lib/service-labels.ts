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
import { loadReferenceCatalog } from "./reference-catalog";
import type { ServiceTypeCategory } from "./service-types";

/**
 * El backend no devuelve un título de servicio ni nombres de zona o de cuadrilla:
 * `GET /services` trae `serviceTypeId`, `crewId` y `zones: [{ zoneId, sequence }]`,
 * todos UUID. El título es
 * presentación, no dominio, así que se compone en el frontend con los catálogos.
 *
 * Los mapas se piden una vez por carga de página (el catálogo completo, todas sus páginas) y se memorizan: un listado de
 * 20 servicios no puede disparar 20 consultas de catálogo. Si el catálogo falla, se
 * devuelve un mapa vacío en lugar de propagar el error: un nombre que falta degrada
 * la etiqueta, no tiene que tirar abajo la pantalla de servicios.
 */
type Catalogo = {
  serviceTypes: Map<string, {
    name: string;
    category: ServiceTypeCategory;
  }>;
  zones: Map<string, string>;
  crews: Map<string, string>;
  vehicles: Map<string, string>;
};
let catalogoPendiente: Promise<Catalogo> | null = null;
async function cargarCatalogo(): Promise<Catalogo> {
  if (stryMutAct_9fa48("14028")) {
    {}
  } else {
    stryCov_9fa48("14028");
    const [serviceTypes, zones, crews, vehicles] = await Promise.all(stryMutAct_9fa48("14029") ? [] : (stryCov_9fa48("14029"), [loadReferenceCatalog(stryMutAct_9fa48("14030") ? "" : (stryCov_9fa48("14030"), "serviceTypes")).then(stryMutAct_9fa48("14031") ? () => undefined : (stryCov_9fa48("14031"), items => new Map(items.map(stryMutAct_9fa48("14032") ? () => undefined : (stryCov_9fa48("14032"), item => stryMutAct_9fa48("14033") ? [] : (stryCov_9fa48("14033"), [item.id, stryMutAct_9fa48("14034") ? {} : (stryCov_9fa48("14034"), {
      name: item.name,
      category: item.category
    })])))))).catch(stryMutAct_9fa48("14035") ? () => undefined : (stryCov_9fa48("14035"), () => new Map<string, {
      name: string;
      category: ServiceTypeCategory;
    }>())), loadReferenceCatalog(stryMutAct_9fa48("14036") ? "" : (stryCov_9fa48("14036"), "zones")).then(stryMutAct_9fa48("14037") ? () => undefined : (stryCov_9fa48("14037"), items => new Map(items.map(stryMutAct_9fa48("14038") ? () => undefined : (stryCov_9fa48("14038"), zone => stryMutAct_9fa48("14039") ? [] : (stryCov_9fa48("14039"), [zone.id, zone.name])))))).catch(stryMutAct_9fa48("14040") ? () => undefined : (stryCov_9fa48("14040"), () => new Map<string, string>())), loadReferenceCatalog(stryMutAct_9fa48("14041") ? "" : (stryCov_9fa48("14041"), "crews")).then(stryMutAct_9fa48("14042") ? () => undefined : (stryCov_9fa48("14042"), items => new Map(items.map(stryMutAct_9fa48("14043") ? () => undefined : (stryCov_9fa48("14043"), crew => stryMutAct_9fa48("14044") ? [] : (stryCov_9fa48("14044"), [crew.id, crew.name])))))).catch(stryMutAct_9fa48("14045") ? () => undefined : (stryCov_9fa48("14045"), () => new Map<string, string>())), loadReferenceCatalog(stryMutAct_9fa48("14046") ? "" : (stryCov_9fa48("14046"), "vehicles")).then(stryMutAct_9fa48("14047") ? () => undefined : (stryCov_9fa48("14047"), items => new Map(items.map(stryMutAct_9fa48("14048") ? () => undefined : (stryCov_9fa48("14048"), vehicle => stryMutAct_9fa48("14049") ? [] : (stryCov_9fa48("14049"), [vehicle.id, vehicle.plate])))))).catch(stryMutAct_9fa48("14050") ? () => undefined : (stryCov_9fa48("14050"), () => new Map<string, string>()))]));
    return stryMutAct_9fa48("14051") ? {} : (stryCov_9fa48("14051"), {
      serviceTypes,
      zones,
      crews,
      vehicles
    });
  }
}
export function catalogoDeEtiquetas(): Promise<Catalogo> {
  if (stryMutAct_9fa48("14052")) {
    {}
  } else {
    stryCov_9fa48("14052");
    stryMutAct_9fa48("14053") ? catalogoPendiente &&= cargarCatalogo() : (stryCov_9fa48("14053"), catalogoPendiente ??= cargarCatalogo());
    return catalogoPendiente;
  }
}

/** Sólo para los tests: vacía la memoria entre casos. */
export function olvidarCatalogoDeEtiquetas(): void {
  if (stryMutAct_9fa48("14054")) {
    {}
  } else {
    stryCov_9fa48("14054");
    catalogoPendiente = null;
  }
}

/**
 * Identifica un servicio en pantalla: el tipo de servicio y dónde se hace. Nunca
 * devuelve un UUID crudo; si no se puede resolver ningún nombre, cae a la fecha
 * programada, que siempre viene.
 */
export function componerTituloDeServicio(input: {
  serviceTypeId: string;
  scheduledDate: string;
  targetRef?: string | null;
  mode?: string;
}, nombres: {
  serviceType?: string;
  zones: string[];
}): string {
  if (stryMutAct_9fa48("14055")) {
    {}
  } else {
    stryCov_9fa48("14055");
    const tipo = stryMutAct_9fa48("14056") ? nombres.serviceType && (input.mode === "ROUTE" ? "Servicio de recorrido" : "Servicio puntual") : (stryCov_9fa48("14056"), nombres.serviceType ?? ((stryMutAct_9fa48("14059") ? input.mode !== "ROUTE" : stryMutAct_9fa48("14058") ? false : stryMutAct_9fa48("14057") ? true : (stryCov_9fa48("14057", "14058", "14059"), input.mode === (stryMutAct_9fa48("14060") ? "" : (stryCov_9fa48("14060"), "ROUTE")))) ? stryMutAct_9fa48("14061") ? "" : (stryCov_9fa48("14061"), "Servicio de recorrido") : stryMutAct_9fa48("14062") ? "" : (stryCov_9fa48("14062"), "Servicio puntual")));
    const donde = stryMutAct_9fa48("14065") ? input.targetRef?.trim() && nombres.zones.join(", ") : stryMutAct_9fa48("14064") ? false : stryMutAct_9fa48("14063") ? true : (stryCov_9fa48("14063", "14064", "14065"), (stryMutAct_9fa48("14067") ? input.targetRef.trim() : stryMutAct_9fa48("14066") ? input.targetRef : (stryCov_9fa48("14066", "14067"), input.targetRef?.trim())) || nombres.zones.join(stryMutAct_9fa48("14068") ? "" : (stryCov_9fa48("14068"), ", ")));
    if (stryMutAct_9fa48("14070") ? false : stryMutAct_9fa48("14069") ? true : (stryCov_9fa48("14069", "14070"), donde)) return stryMutAct_9fa48("14071") ? `` : (stryCov_9fa48("14071"), `${tipo} — ${donde}`);
    const fecha = stryMutAct_9fa48("14072") ? input.scheduledDate : (stryCov_9fa48("14072"), input.scheduledDate.slice(0, 10));
    return stryMutAct_9fa48("14073") ? `` : (stryCov_9fa48("14073"), `${tipo} — ${fecha}`);
  }
}