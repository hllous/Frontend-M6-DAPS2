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
import { z } from "zod";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

/** Barrio del catálogo de M9 que cachea el backend de M6. `id` (UUID) es lo que se guarda en una zona. */
export const neighborhoodSchema = z.object(stryMutAct_9fa48("11709") ? {} : (stryCov_9fa48("11709"), {
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  /** Comuna administrativa de M9 (`comuna-14`); los barrios dados de baja traen zonas ficticias (`norte`). */
  zona: z.string(),
  zonaNombre: z.string(),
  metadatos: z.record(z.string(), z.unknown()).nullish(),
  activo: z.boolean()
}));
export type Neighborhood = z.infer<typeof neighborhoodSchema>;
export type NeighborhoodQuery = {
  soloActivos?: boolean;
  zona?: string;
  q?: string;
};
export class NeighborhoodRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    if (stryMutAct_9fa48("11710")) {
      {}
    } else {
      stryCov_9fa48("11710");
      super(message);
      this.name = stryMutAct_9fa48("11711") ? "" : (stryCov_9fa48("11711"), "NeighborhoodRequestError");
      this.status = status;
    }
  }
}

/** 503 del backend: el catálogo de M9 todavía no se pudo leer del Core. */
export function isCatalogUnavailable(error: unknown): boolean {
  if (stryMutAct_9fa48("11712")) {
    {}
  } else {
    stryCov_9fa48("11712");
    return stryMutAct_9fa48("11715") ? error instanceof NeighborhoodRequestError || error.status === 503 : stryMutAct_9fa48("11714") ? false : stryMutAct_9fa48("11713") ? true : (stryCov_9fa48("11713", "11714", "11715"), error instanceof NeighborhoodRequestError && (stryMutAct_9fa48("11717") ? error.status !== 503 : stryMutAct_9fa48("11716") ? true : (stryCov_9fa48("11716", "11717"), error.status === 503)));
  }
}
const SUBJECT_LABEL = {
  barrios: "los barrios",
  comunas: "las comunas"
} as const;
const RESOURCE = {
  barrios: "neighborhoods",
  comunas: "communes"
} as const;

/** Mensaje para el usuario según el fallo del catálogo. Solo los barrios tienen 503 en el contrato. */
export function catalogErrorMessage(error: unknown, subject: "barrios" | "comunas" = stryMutAct_9fa48("11718") ? "" : (stryCov_9fa48("11718"), "barrios")): string {
  if (stryMutAct_9fa48("11719")) {
    {}
  } else {
    stryCov_9fa48("11719");
    return (stryMutAct_9fa48("11722") ? subject === "barrios" || isCatalogUnavailable(error) : stryMutAct_9fa48("11721") ? false : stryMutAct_9fa48("11720") ? true : (stryCov_9fa48("11720", "11721", "11722"), (stryMutAct_9fa48("11724") ? subject !== "barrios" : stryMutAct_9fa48("11723") ? true : (stryCov_9fa48("11723", "11724"), subject === (stryMutAct_9fa48("11725") ? "" : (stryCov_9fa48("11725"), "barrios")))) && isCatalogUnavailable(error))) ? stryMutAct_9fa48("11726") ? "" : (stryCov_9fa48("11726"), "El catálogo de barrios todavía no está disponible. Intente nuevamente en unos minutos.") : stryMutAct_9fa48("11727") ? `` : (stryCov_9fa48("11727"), `No se pudieron cargar ${SUBJECT_LABEL[subject]}. Intente nuevamente.`);
  }
}

/** Lee `GET /api/<recurso>` del BFF (array sin paginar): errores tipados y forma validada. */
export async function fetchCatalogList<T extends z.ZodType>(url: string, itemSchema: T, subject: "barrios" | "comunas"): Promise<z.output<T>[]> {
  if (stryMutAct_9fa48("11728")) {
    {}
  } else {
    stryCov_9fa48("11728");
    let response: Response;
    try {
      if (stryMutAct_9fa48("11729")) {
        {}
      } else {
        stryCov_9fa48("11729");
        response = await authenticatedFetch(url);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("11730")) {
        {}
      } else {
        stryCov_9fa48("11730");
        if (stryMutAct_9fa48("11732") ? false : stryMutAct_9fa48("11731") ? true : (stryCov_9fa48("11731", "11732"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("11733")) {
            {}
          } else {
            stryCov_9fa48("11733");
            recordTelemetryEvent(stryMutAct_9fa48("11735") ? {} : (stryCov_9fa48("11735"), {
              name: stryMutAct_9fa48("11736") ? "" : (stryCov_9fa48("11736"), "request_network_failure"),
              resource: RESOURCE[subject]
            }));
          }
        }
        throw cause;
      }
    }
    const payload: unknown = await response.json().catch(() => undefined);
    if (stryMutAct_9fa48("11739") ? false : stryMutAct_9fa48("11738") ? true : stryMutAct_9fa48("11737") ? response.ok : (stryCov_9fa48("11737", "11738", "11739"), !response.ok)) {
      if (stryMutAct_9fa48("11740")) {
        {}
      } else {
        stryCov_9fa48("11740");
        const message = stryMutAct_9fa48("11741") ? (payload as {
          message?: unknown;
        } | undefined).message : (stryCov_9fa48("11741"), (payload as {
          message?: unknown;
        } | undefined)?.message);
        throw new NeighborhoodRequestError(Array.isArray(message) ? message.join(stryMutAct_9fa48("11743") ? "" : (stryCov_9fa48("11743"), " ")) : (stryMutAct_9fa48("11746") ? typeof message !== "string" : stryMutAct_9fa48("11745") ? false : stryMutAct_9fa48("11744") ? true : (stryCov_9fa48("11744", "11745", "11746"), typeof message === (stryMutAct_9fa48("11747") ? "" : (stryCov_9fa48("11747"), "string")))) ? message : stryMutAct_9fa48("11748") ? `` : (stryCov_9fa48("11748"), `No se pudieron cargar ${SUBJECT_LABEL[subject]}.`), response.status);
      }
    }
    const parsed = z.array(itemSchema).safeParse(payload);
    if (stryMutAct_9fa48("11751") ? false : stryMutAct_9fa48("11750") ? true : stryMutAct_9fa48("11749") ? parsed.success : (stryCov_9fa48("11749", "11750", "11751"), !parsed.success)) {
      if (stryMutAct_9fa48("11752")) {
        {}
      } else {
        stryCov_9fa48("11752");
        recordTelemetryEvent(stryMutAct_9fa48("11754") ? {} : (stryCov_9fa48("11754"), {
          name: stryMutAct_9fa48("11755") ? "" : (stryCov_9fa48("11755"), "request_malformed_response"),
          resource: RESOURCE[subject]
        }));
        throw new NeighborhoodRequestError(stryMutAct_9fa48("11757") ? `` : (stryCov_9fa48("11757"), `No se pudo obtener información válida de ${subject}. Reintente en unos segundos.`), 502);
      }
    }
    return parsed.data;
  }
}
export const neighborhoodsAdapter = stryMutAct_9fa48("11758") ? {} : (stryCov_9fa48("11758"), {
  list(query: NeighborhoodQuery = {}): Promise<Neighborhood[]> {
    if (stryMutAct_9fa48("11759")) {
      {}
    } else {
      stryCov_9fa48("11759");
      const params = new URLSearchParams();
      if (stryMutAct_9fa48("11762") ? query.soloActivos === undefined : stryMutAct_9fa48("11761") ? false : stryMutAct_9fa48("11760") ? true : (stryCov_9fa48("11760", "11761", "11762"), query.soloActivos !== undefined)) params.set(stryMutAct_9fa48("11764") ? "" : (stryCov_9fa48("11764"), "soloActivos"), String(query.soloActivos));
      if (stryMutAct_9fa48("11766") ? false : stryMutAct_9fa48("11765") ? true : (stryCov_9fa48("11765", "11766"), query.zona)) params.set(stryMutAct_9fa48("11768") ? "" : (stryCov_9fa48("11768"), "zona"), query.zona);
      if (stryMutAct_9fa48("11770") ? false : stryMutAct_9fa48("11769") ? true : (stryCov_9fa48("11769", "11770"), query.q)) params.set(stryMutAct_9fa48("11772") ? "" : (stryCov_9fa48("11772"), "q"), query.q);
      const queryString = params.toString();
      return fetchCatalogList(stryMutAct_9fa48("11773") ? `` : (stryCov_9fa48("11773"), `/api/neighborhoods${queryString ? stryMutAct_9fa48("11774") ? `` : (stryCov_9fa48("11774"), `?${queryString}`) : stryMutAct_9fa48("11775") ? "Stryker was here!" : (stryCov_9fa48("11775"), "")}`), neighborhoodSchema, stryMutAct_9fa48("11776") ? "" : (stryCov_9fa48("11776"), "barrios"));
    }
  }
});

/** El nombre se resuelve al mostrar (un barrio puede renombrarse); nunca se expone el id crudo. */
export type CatalogStatus = "loading" | "ready" | "failed";
export function neighborhoodName(catalog: Neighborhood[], id: string, status: CatalogStatus = stryMutAct_9fa48("11777") ? "" : (stryCov_9fa48("11777"), "ready")): string {
  if (stryMutAct_9fa48("11778")) {
    {}
  } else {
    stryCov_9fa48("11778");
    const found = catalog.find(stryMutAct_9fa48("11779") ? () => undefined : (stryCov_9fa48("11779"), neighborhood => stryMutAct_9fa48("11782") ? neighborhood.id !== id : stryMutAct_9fa48("11781") ? false : stryMutAct_9fa48("11780") ? true : (stryCov_9fa48("11780", "11781", "11782"), neighborhood.id === id)));
    if (stryMutAct_9fa48("11784") ? false : stryMutAct_9fa48("11783") ? true : (stryCov_9fa48("11783", "11784"), found)) return found.nombre;
    if (stryMutAct_9fa48("11787") ? status !== "failed" : stryMutAct_9fa48("11786") ? false : stryMutAct_9fa48("11785") ? true : (stryCov_9fa48("11785", "11786", "11787"), status === (stryMutAct_9fa48("11788") ? "" : (stryCov_9fa48("11788"), "failed")))) return stryMutAct_9fa48("11789") ? "" : (stryCov_9fa48("11789"), "No se pudo cargar el nombre");
    return (stryMutAct_9fa48("11792") ? status !== "ready" : stryMutAct_9fa48("11791") ? false : stryMutAct_9fa48("11790") ? true : (stryCov_9fa48("11790", "11791", "11792"), status === (stryMutAct_9fa48("11793") ? "" : (stryCov_9fa48("11793"), "ready")))) ? stryMutAct_9fa48("11794") ? "" : (stryCov_9fa48("11794"), "Barrio no disponible") : stryMutAct_9fa48("11795") ? "" : (stryCov_9fa48("11795"), "Cargando barrio…");
  }
}
export type NeighborhoodGroup = {
  key: string;
  label: string;
  neighborhoods: Neighborhood[];
};
const communeNumber = stryMutAct_9fa48("11796") ? () => undefined : (stryCov_9fa48("11796"), (() => {
  const communeNumber = (key: string) => Number(stryMutAct_9fa48("11797") ? /^comuna-(\d+)$/.exec(key)?.[1] && Number.POSITIVE_INFINITY : (stryCov_9fa48("11797"), (stryMutAct_9fa48("11798") ? /^comuna-(\d+)$/.exec(key)[1] : (stryCov_9fa48("11798"), (stryMutAct_9fa48("11802") ? /^comuna-(\D+)$/ : stryMutAct_9fa48("11801") ? /^comuna-(\d)$/ : stryMutAct_9fa48("11800") ? /^comuna-(\d+)/ : stryMutAct_9fa48("11799") ? /comuna-(\d+)$/ : (stryCov_9fa48("11799", "11800", "11801", "11802"), /^comuna-(\d+)$/)).exec(key)?.[1])) ?? Number.POSITIVE_INFINITY));
  return communeNumber;
})());

/** Agrupa por comuna (orden numérico, luego alfabético) y los barrios por nombre, para el selector. */
export function groupNeighborhoodsByCommune(neighborhoods: Neighborhood[]): NeighborhoodGroup[] {
  if (stryMutAct_9fa48("11803")) {
    {}
  } else {
    stryCov_9fa48("11803");
    const groups = new Map<string, NeighborhoodGroup>();
    for (const neighborhood of neighborhoods) {
      if (stryMutAct_9fa48("11804")) {
        {}
      } else {
        stryCov_9fa48("11804");
        const group = stryMutAct_9fa48("11805") ? groups.get(neighborhood.zona) && {
          key: neighborhood.zona,
          label: neighborhood.zonaNombre,
          neighborhoods: []
        } : (stryCov_9fa48("11805"), groups.get(neighborhood.zona) ?? (stryMutAct_9fa48("11806") ? {} : (stryCov_9fa48("11806"), {
          key: neighborhood.zona,
          label: neighborhood.zonaNombre,
          neighborhoods: stryMutAct_9fa48("11807") ? ["Stryker was here"] : (stryCov_9fa48("11807"), [])
        })));
        if (stryMutAct_9fa48("11808")) {
          ;
        } else {
          stryCov_9fa48("11808");
          group.neighborhoods.push(neighborhood);
        }
        if (stryMutAct_9fa48("11809")) {
          ;
        } else {
          stryCov_9fa48("11809");
          groups.set(neighborhood.zona, group);
        }
      }
    }
    return stryMutAct_9fa48("11810") ? [...groups.values()].map(group => ({
      ...group,
      neighborhoods: [...group.neighborhoods].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    })) : (stryCov_9fa48("11810"), (stryMutAct_9fa48("11811") ? [] : (stryCov_9fa48("11811"), [...groups.values()])).sort(stryMutAct_9fa48("11812") ? () => undefined : (stryCov_9fa48("11812"), (a, b) => stryMutAct_9fa48("11815") ? communeNumber(a.key) - communeNumber(b.key) && a.label.localeCompare(b.label, "es") : stryMutAct_9fa48("11814") ? false : stryMutAct_9fa48("11813") ? true : (stryCov_9fa48("11813", "11814", "11815"), (stryMutAct_9fa48("11816") ? communeNumber(a.key) + communeNumber(b.key) : (stryCov_9fa48("11816"), communeNumber(a.key) - communeNumber(b.key))) || a.label.localeCompare(b.label, stryMutAct_9fa48("11817") ? "" : (stryCov_9fa48("11817"), "es"))))).map(stryMutAct_9fa48("11818") ? () => undefined : (stryCov_9fa48("11818"), group => stryMutAct_9fa48("11819") ? {} : (stryCov_9fa48("11819"), {
      ...group,
      neighborhoods: stryMutAct_9fa48("11820") ? [...group.neighborhoods] : (stryCov_9fa48("11820"), (stryMutAct_9fa48("11821") ? [] : (stryCov_9fa48("11821"), [...group.neighborhoods])).sort(stryMutAct_9fa48("11822") ? () => undefined : (stryCov_9fa48("11822"), (a, b) => a.nombre.localeCompare(b.nombre, stryMutAct_9fa48("11823") ? "" : (stryCov_9fa48("11823"), "es")))))
    }))));
  }
}