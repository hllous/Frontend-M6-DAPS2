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
import { withFlatIds } from "./backend-shape";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { externalIdListInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export type ZoneQuery = {
  active?: boolean;
  search?: string;
  /** UUID de la comuna (filtro del listado). */
  communeId?: string;
  page?: number;
  pageSize?: number;
};
export type ZonesPage = {
  zones: Zone[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class ZoneContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("17164")) {
      {}
    } else {
      stryCov_9fa48("17164");
      super(message, options);
      this.name = stryMutAct_9fa48("17165") ? "" : (stryCov_9fa48("17165"), "ZoneContractError");
    }
  }
}
export class ZoneRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("17166")) {
      {}
    } else {
      stryCov_9fa48("17166");
      super(message, options);
      this.name = stryMutAct_9fa48("17167") ? "" : (stryCov_9fa48("17167"), "ZoneRequestError");
      this.status = status;
    }
  }
}

// El listado no trae barrios y el detalle los trae como neighborhoods: [{ neighborhoodId }].
export const zoneCommuneSchema = z.object(stryMutAct_9fa48("17168") ? {} : (stryCov_9fa48("17168"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  number: z.number().optional()
}));
// `codigo` y `nombre` faltan cuando el catálogo de M9 no está cargado en el backend.
export const zoneNeighborhoodSchema = z.object(stryMutAct_9fa48("17169") ? {} : (stryCov_9fa48("17169"), {
  id: z.string(),
  codigo: z.string().optional(),
  nombre: z.string().optional()
}));

// Una zona es un barrio: `code` es el `codigo` del barrio. Para cruzarla con el catálogo o con un GeoJSON usar
// `neighborhood.codigo` / `commune.code`, no el `code` de la zona. Ambos pueden ser null.
export const zoneSchema = z.object(stryMutAct_9fa48("17170") ? {} : (stryCov_9fa48("17170"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  commune: zoneCommuneSchema.nullish(),
  neighborhood: zoneNeighborhoodSchema.nullish(),
  neighborhoodIds: z.array(z.string()).optional()
}));
const zoneWireSchema = z.preprocess(withFlatIds(stryMutAct_9fa48("17171") ? "" : (stryCov_9fa48("17171"), "neighborhoods"), stryMutAct_9fa48("17172") ? "" : (stryCov_9fa48("17172"), "neighborhoodId"), stryMutAct_9fa48("17173") ? "" : (stryCov_9fa48("17173"), "neighborhoodIds")), zoneSchema);
export type Zone = z.infer<typeof zoneSchema>;

/** Número de comuna (1 a 15); `null` si la zona no tiene comuna o no se puede leer el número. */
export function communeNumber(commune: Zone["commune"]): number | null {
  if (stryMutAct_9fa48("17174")) {
    {}
  } else {
    stryCov_9fa48("17174");
    if (stryMutAct_9fa48("17177") ? false : stryMutAct_9fa48("17176") ? true : stryMutAct_9fa48("17175") ? commune : (stryCov_9fa48("17175", "17176", "17177"), !commune)) return null;
    if (stryMutAct_9fa48("17180") ? typeof commune.number !== "number" : stryMutAct_9fa48("17179") ? false : stryMutAct_9fa48("17178") ? true : (stryCov_9fa48("17178", "17179", "17180"), typeof commune.number === (stryMutAct_9fa48("17181") ? "" : (stryCov_9fa48("17181"), "number")))) return commune.number;
    const parsed = Number(stryMutAct_9fa48("17182") ? /\d+/.exec(commune.name)[0] : (stryCov_9fa48("17182"), (stryMutAct_9fa48("17184") ? /\D+/ : stryMutAct_9fa48("17183") ? /\d/ : (stryCov_9fa48("17183", "17184"), /\d+/)).exec(commune.name)?.[0]));
    return Number.isNaN(parsed) ? null : parsed;
  }
}

/**
 * Zonas por número de comuna (numérico: la 10 va después de la 2), alfabético por nombre dentro de cada una y
 * las zonas sin comuna al final. El backend ya lo hace (Backend #457); se repite acá para los datos que no
 * pasan por él (mocks, cachés) y es idempotente sobre una página ya ordenada.
 */
export function sortZonesByCommune(zones: Zone[]): Zone[] {
  if (stryMutAct_9fa48("17185")) {
    {}
  } else {
    stryCov_9fa48("17185");
    return stryMutAct_9fa48("17186") ? [...zones] : (stryCov_9fa48("17186"), (stryMutAct_9fa48("17187") ? [] : (stryCov_9fa48("17187"), [...zones])).sort((a, b) => {
      if (stryMutAct_9fa48("17188")) {
        {}
      } else {
        stryCov_9fa48("17188");
        const left = stryMutAct_9fa48("17189") ? communeNumber(a.commune) && Infinity : (stryCov_9fa48("17189"), communeNumber(a.commune) ?? Infinity);
        const right = stryMutAct_9fa48("17190") ? communeNumber(b.commune) && Infinity : (stryCov_9fa48("17190"), communeNumber(b.commune) ?? Infinity);
        return (stryMutAct_9fa48("17193") ? left !== right : stryMutAct_9fa48("17192") ? false : stryMutAct_9fa48("17191") ? true : (stryCov_9fa48("17191", "17192", "17193"), left === right)) ? a.name.localeCompare(b.name, stryMutAct_9fa48("17194") ? "" : (stryCov_9fa48("17194"), "es")) : (stryMutAct_9fa48("17198") ? left >= right : stryMutAct_9fa48("17197") ? left <= right : stryMutAct_9fa48("17196") ? false : stryMutAct_9fa48("17195") ? true : (stryCov_9fa48("17195", "17196", "17197", "17198"), left < right)) ? stryMutAct_9fa48("17199") ? +1 : (stryCov_9fa48("17199"), -1) : 1;
      }
    }));
  }
}

/** Etiqueta de zona para tablas y detalles: nunca expone el id crudo. */
export function zoneLabel(zones: Zone[], zoneId: string, loaded: boolean): string {
  if (stryMutAct_9fa48("17200")) {
    {}
  } else {
    stryCov_9fa48("17200");
    const zone = zones.find(stryMutAct_9fa48("17201") ? () => undefined : (stryCov_9fa48("17201"), candidate => stryMutAct_9fa48("17204") ? candidate.id !== zoneId : stryMutAct_9fa48("17203") ? false : stryMutAct_9fa48("17202") ? true : (stryCov_9fa48("17202", "17203", "17204"), candidate.id === zoneId)));
    if (stryMutAct_9fa48("17206") ? false : stryMutAct_9fa48("17205") ? true : (stryCov_9fa48("17205", "17206"), zone)) return zone.name;
    return loaded ? stryMutAct_9fa48("17207") ? "" : (stryCov_9fa48("17207"), "Zona no disponible") : stryMutAct_9fa48("17208") ? "" : (stryCov_9fa48("17208"), "Cargando zona…");
  }
}
const communeIdInput = z.uuid(stryMutAct_9fa48("17209") ? "" : (stryCov_9fa48("17209"), "La comuna no es válida"));
export const createZoneInputSchema = z.object(stryMutAct_9fa48("17210") ? {} : (stryCov_9fa48("17210"), {
  code: stryMutAct_9fa48("17213") ? z.string().min(1, "El código es obligatorio").max(20, "El código admite hasta 20 caracteres") : stryMutAct_9fa48("17212") ? z.string().trim().max(1, "El código es obligatorio").max(20, "El código admite hasta 20 caracteres") : stryMutAct_9fa48("17211") ? z.string().trim().min(1, "El código es obligatorio").min(20, "El código admite hasta 20 caracteres") : (stryCov_9fa48("17211", "17212", "17213"), z.string().trim().min(1, stryMutAct_9fa48("17214") ? "" : (stryCov_9fa48("17214"), "El código es obligatorio")).max(20, stryMutAct_9fa48("17215") ? "" : (stryCov_9fa48("17215"), "El código admite hasta 20 caracteres"))),
  name: stryMutAct_9fa48("17218") ? z.string().min(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres") : stryMutAct_9fa48("17217") ? z.string().trim().max(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres") : stryMutAct_9fa48("17216") ? z.string().trim().min(1, "El nombre es obligatorio").min(100, "El nombre admite hasta 100 caracteres") : (stryCov_9fa48("17216", "17217", "17218"), z.string().trim().min(1, stryMutAct_9fa48("17219") ? "" : (stryCov_9fa48("17219"), "El nombre es obligatorio")).max(100, stryMutAct_9fa48("17220") ? "" : (stryCov_9fa48("17220"), "El nombre admite hasta 100 caracteres"))),
  communeId: communeIdInput.optional()
}));
export type CreateZoneInput = z.infer<typeof createZoneInputSchema>;
export const updateZoneInputSchema = z.object(stryMutAct_9fa48("17221") ? {} : (stryCov_9fa48("17221"), {
  name: stryMutAct_9fa48("17224") ? z.string().min(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres").optional() : stryMutAct_9fa48("17223") ? z.string().trim().max(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres").optional() : stryMutAct_9fa48("17222") ? z.string().trim().min(1, "El nombre es obligatorio").min(100, "El nombre admite hasta 100 caracteres").optional() : (stryCov_9fa48("17222", "17223", "17224"), z.string().trim().min(1, stryMutAct_9fa48("17225") ? "" : (stryCov_9fa48("17225"), "El nombre es obligatorio")).max(100, stryMutAct_9fa48("17226") ? "" : (stryCov_9fa48("17226"), "El nombre admite hasta 100 caracteres")).optional()),
  active: z.boolean().optional(),
  /** `null` desasigna la comuna. */
  communeId: communeIdInput.nullable().optional()
}));
export type UpdateZoneInput = z.infer<typeof updateZoneInputSchema>;
export const assignNeighborhoodsInputSchema = z.object(stryMutAct_9fa48("17227") ? {} : (stryCov_9fa48("17227"), {
  neighborhoodIds: externalIdListInput(stryMutAct_9fa48("17228") ? {} : (stryCov_9fa48("17228"), {
    itemMessage: stryMutAct_9fa48("17229") ? "" : (stryCov_9fa48("17229"), "El ID del barrio es obligatorio"),
    emptyMessage: stryMutAct_9fa48("17230") ? "" : (stryCov_9fa48("17230"), "Seleccione al menos un barrio.")
  }))
}));
export type AssignNeighborhoodsInput = z.infer<typeof assignNeighborhoodsInputSchema>;
export const zoneReferenceReportSchema = z.object(stryMutAct_9fa48("17231") ? {} : (stryCov_9fa48("17231"), {
  zoneId: z.string(),
  activeRoutes: z.array(z.object(stryMutAct_9fa48("17232") ? {} : (stryCov_9fa48("17232"), {
    id: z.string(),
    code: z.string(),
    name: z.string()
  }))),
  containersCount: z.number(),
  treesCount: z.number(),
  greenSpacesCount: z.number(),
  totalReferences: z.number()
}));
export type ZoneReferenceReport = z.infer<typeof zoneReferenceReportSchema>;
const zonesEnvelopeSchema = z.object(stryMutAct_9fa48("17233") ? {} : (stryCov_9fa48("17233"), {
  data: tolerantRecords(zoneWireSchema, stryMutAct_9fa48("17234") ? "" : (stryCov_9fa48("17234"), "zones")),
  meta: z.object(stryMutAct_9fa48("17235") ? {} : (stryCov_9fa48("17235"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("17236") ? {} : (stryCov_9fa48("17236"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("17237") ? [] : (stryCov_9fa48("17237"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function buildZonesQueryString(query: ZoneQuery): string {
  if (stryMutAct_9fa48("17238")) {
    {}
  } else {
    stryCov_9fa48("17238");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("17241") ? query.active === undefined : stryMutAct_9fa48("17240") ? false : stryMutAct_9fa48("17239") ? true : (stryCov_9fa48("17239", "17240", "17241"), query.active !== undefined)) params.set(stryMutAct_9fa48("17243") ? "" : (stryCov_9fa48("17243"), "active"), String(query.active));
    if (stryMutAct_9fa48("17245") ? false : stryMutAct_9fa48("17244") ? true : (stryCov_9fa48("17244", "17245"), query.search)) params.set(stryMutAct_9fa48("17247") ? "" : (stryCov_9fa48("17247"), "search"), query.search);
    if (stryMutAct_9fa48("17249") ? false : stryMutAct_9fa48("17248") ? true : (stryCov_9fa48("17248", "17249"), query.communeId)) params.set(stryMutAct_9fa48("17251") ? "" : (stryCov_9fa48("17251"), "communeId"), query.communeId);
    if (stryMutAct_9fa48("17254") ? query.page === undefined : stryMutAct_9fa48("17253") ? false : stryMutAct_9fa48("17252") ? true : (stryCov_9fa48("17252", "17253", "17254"), query.page !== undefined)) params.set(stryMutAct_9fa48("17256") ? "" : (stryCov_9fa48("17256"), "page"), String(query.page));
    if (stryMutAct_9fa48("17259") ? query.pageSize === undefined : stryMutAct_9fa48("17258") ? false : stryMutAct_9fa48("17257") ? true : (stryCov_9fa48("17257", "17258", "17259"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("17261") ? "" : (stryCov_9fa48("17261"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("17262") ? `` : (stryCov_9fa48("17262"), `?${queryString}`) : stryMutAct_9fa48("17263") ? "Stryker was here!" : (stryCov_9fa48("17263"), "");
  }
}
async function readJsonBody(response: Response, resource: "zones" = stryMutAct_9fa48("17264") ? "" : (stryCov_9fa48("17264"), "zones")): Promise<unknown> {
  if (stryMutAct_9fa48("17265")) {
    {}
  } else {
    stryCov_9fa48("17265");
    try {
      if (stryMutAct_9fa48("17266")) {
        {}
      } else {
        stryCov_9fa48("17266");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("17267")) {
        {}
      } else {
        stryCov_9fa48("17267");
        recordTelemetryEvent(stryMutAct_9fa48("17269") ? {} : (stryCov_9fa48("17269"), {
          name: stryMutAct_9fa48("17270") ? "" : (stryCov_9fa48("17270"), "request_malformed_response"),
          resource
        }));
        throw new ZoneContractError(stryMutAct_9fa48("17272") ? "" : (stryCov_9fa48("17272"), "No se pudo obtener información válida de zonas. Reintente en unos segundos."), stryMutAct_9fa48("17273") ? {} : (stryCov_9fa48("17273"), {
          cause
        }));
      }
    }
  }
}
function handleErrorPayload(payload: unknown, resource: "zones" = stryMutAct_9fa48("17274") ? "" : (stryCov_9fa48("17274"), "zones")): never {
  if (stryMutAct_9fa48("17275")) {
    {}
  } else {
    stryCov_9fa48("17275");
    const parsedError = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("17278") ? false : stryMutAct_9fa48("17277") ? true : stryMutAct_9fa48("17276") ? parsedError.success : (stryCov_9fa48("17276", "17277", "17278"), !parsedError.success)) {
      if (stryMutAct_9fa48("17279")) {
        {}
      } else {
        stryCov_9fa48("17279");
        recordTelemetryEvent(stryMutAct_9fa48("17281") ? {} : (stryCov_9fa48("17281"), {
          name: stryMutAct_9fa48("17282") ? "" : (stryCov_9fa48("17282"), "request_malformed_response"),
          resource
        }));
        throw new ZoneContractError(stryMutAct_9fa48("17284") ? "" : (stryCov_9fa48("17284"), "No se pudo obtener información válida de zonas. Reintente en unos segundos."), stryMutAct_9fa48("17285") ? {} : (stryCov_9fa48("17285"), {
          cause: parsedError.error
        }));
      }
    }
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("17286") ? "" : (stryCov_9fa48("17286"), " ")) : parsedError.data.message;
    if (stryMutAct_9fa48("17287")) {
      ;
    } else {
      stryCov_9fa48("17287");
      throw new ZoneRequestError(message, parsedError.data.statusCode);
    }
  }
}
async function handleSingleZoneResponse(response: Response, resource: "zones" = stryMutAct_9fa48("17288") ? "" : (stryCov_9fa48("17288"), "zones")): Promise<Zone> {
  if (stryMutAct_9fa48("17289")) {
    {}
  } else {
    stryCov_9fa48("17289");
    const payload = await readJsonBody(response, resource);
    if (stryMutAct_9fa48("17292") ? false : stryMutAct_9fa48("17291") ? true : stryMutAct_9fa48("17290") ? response.ok : (stryCov_9fa48("17290", "17291", "17292"), !response.ok)) {
      if (stryMutAct_9fa48("17293")) {
        {}
      } else {
        stryCov_9fa48("17293");
        if (stryMutAct_9fa48("17294")) {
          ;
        } else {
          stryCov_9fa48("17294");
          handleErrorPayload(payload, resource);
        }
      }
    }
    const parsed = zoneWireSchema.safeParse(payload);
    if (stryMutAct_9fa48("17297") ? false : stryMutAct_9fa48("17296") ? true : stryMutAct_9fa48("17295") ? parsed.success : (stryCov_9fa48("17295", "17296", "17297"), !parsed.success)) {
      if (stryMutAct_9fa48("17298")) {
        {}
      } else {
        stryCov_9fa48("17298");
        recordTelemetryEvent(stryMutAct_9fa48("17300") ? {} : (stryCov_9fa48("17300"), {
          name: stryMutAct_9fa48("17301") ? "" : (stryCov_9fa48("17301"), "request_malformed_response"),
          resource
        }));
        throw new ZoneContractError(stryMutAct_9fa48("17303") ? "" : (stryCov_9fa48("17303"), "No se pudo obtener información válida de zona. Reintente en unos segundos."), stryMutAct_9fa48("17304") ? {} : (stryCov_9fa48("17304"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const zonesAdapter = stryMutAct_9fa48("17305") ? {} : (stryCov_9fa48("17305"), {
  async list(query: ZoneQuery = {}): Promise<ZonesPage> {
    if (stryMutAct_9fa48("17306")) {
      {}
    } else {
      stryCov_9fa48("17306");
      let response: Response;
      try {
        if (stryMutAct_9fa48("17307")) {
          {}
        } else {
          stryCov_9fa48("17307");
          response = await authenticatedFetch(stryMutAct_9fa48("17308") ? `` : (stryCov_9fa48("17308"), `/api/zones${buildZonesQueryString(query)}`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17309")) {
          {}
        } else {
          stryCov_9fa48("17309");
          if (stryMutAct_9fa48("17311") ? false : stryMutAct_9fa48("17310") ? true : (stryCov_9fa48("17310", "17311"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17312")) {
              {}
            } else {
              stryCov_9fa48("17312");
              recordTelemetryEvent(stryMutAct_9fa48("17314") ? {} : (stryCov_9fa48("17314"), {
                name: stryMutAct_9fa48("17315") ? "" : (stryCov_9fa48("17315"), "request_network_failure"),
                resource: stryMutAct_9fa48("17316") ? "" : (stryCov_9fa48("17316"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("17319") ? false : stryMutAct_9fa48("17318") ? true : stryMutAct_9fa48("17317") ? response.ok : (stryCov_9fa48("17317", "17318", "17319"), !response.ok)) {
        if (stryMutAct_9fa48("17320")) {
          {}
        } else {
          stryCov_9fa48("17320");
          if (stryMutAct_9fa48("17321")) {
            ;
          } else {
            stryCov_9fa48("17321");
            handleErrorPayload(payload);
          }
        }
      }
      const parsed = zonesEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("17324") ? false : stryMutAct_9fa48("17323") ? true : stryMutAct_9fa48("17322") ? parsed.success : (stryCov_9fa48("17322", "17323", "17324"), !parsed.success)) {
        if (stryMutAct_9fa48("17325")) {
          {}
        } else {
          stryCov_9fa48("17325");
          recordTelemetryEvent(stryMutAct_9fa48("17327") ? {} : (stryCov_9fa48("17327"), {
            name: stryMutAct_9fa48("17328") ? "" : (stryCov_9fa48("17328"), "request_malformed_response"),
            resource: stryMutAct_9fa48("17329") ? "" : (stryCov_9fa48("17329"), "zones")
          }));
          throw new ZoneContractError(stryMutAct_9fa48("17331") ? "" : (stryCov_9fa48("17331"), "No se pudo obtener información válida de zonas. Reintente en unos segundos."), stryMutAct_9fa48("17332") ? {} : (stryCov_9fa48("17332"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("17333") ? {} : (stryCov_9fa48("17333"), {
        zones: sortZonesByCommune(parsed.data.data),
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Zone> {
    if (stryMutAct_9fa48("17334")) {
      {}
    } else {
      stryCov_9fa48("17334");
      let response: Response;
      try {
        if (stryMutAct_9fa48("17335")) {
          {}
        } else {
          stryCov_9fa48("17335");
          response = await authenticatedFetch(stryMutAct_9fa48("17336") ? `` : (stryCov_9fa48("17336"), `/api/zones/${id}`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17337")) {
          {}
        } else {
          stryCov_9fa48("17337");
          if (stryMutAct_9fa48("17339") ? false : stryMutAct_9fa48("17338") ? true : (stryCov_9fa48("17338", "17339"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17340")) {
              {}
            } else {
              stryCov_9fa48("17340");
              recordTelemetryEvent(stryMutAct_9fa48("17342") ? {} : (stryCov_9fa48("17342"), {
                name: stryMutAct_9fa48("17343") ? "" : (stryCov_9fa48("17343"), "request_network_failure"),
                resource: stryMutAct_9fa48("17344") ? "" : (stryCov_9fa48("17344"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response);
    }
  },
  async create(input: CreateZoneInput): Promise<Zone> {
    if (stryMutAct_9fa48("17345")) {
      {}
    } else {
      stryCov_9fa48("17345");
      const validated = createZoneInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("17346")) {
          {}
        } else {
          stryCov_9fa48("17346");
          response = await authenticatedFetch(stryMutAct_9fa48("17347") ? "" : (stryCov_9fa48("17347"), "/api/zones"), stryMutAct_9fa48("17348") ? {} : (stryCov_9fa48("17348"), {
            method: stryMutAct_9fa48("17349") ? "" : (stryCov_9fa48("17349"), "POST"),
            headers: stryMutAct_9fa48("17350") ? {} : (stryCov_9fa48("17350"), {
              "content-type": stryMutAct_9fa48("17351") ? "" : (stryCov_9fa48("17351"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17352")) {
          {}
        } else {
          stryCov_9fa48("17352");
          if (stryMutAct_9fa48("17354") ? false : stryMutAct_9fa48("17353") ? true : (stryCov_9fa48("17353", "17354"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17355")) {
              {}
            } else {
              stryCov_9fa48("17355");
              recordTelemetryEvent(stryMutAct_9fa48("17357") ? {} : (stryCov_9fa48("17357"), {
                name: stryMutAct_9fa48("17358") ? "" : (stryCov_9fa48("17358"), "request_network_failure"),
                resource: stryMutAct_9fa48("17359") ? "" : (stryCov_9fa48("17359"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response);
    }
  },
  async update(id: string, input: UpdateZoneInput): Promise<Zone> {
    if (stryMutAct_9fa48("17360")) {
      {}
    } else {
      stryCov_9fa48("17360");
      const validated = updateZoneInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("17361")) {
          {}
        } else {
          stryCov_9fa48("17361");
          response = await authenticatedFetch(stryMutAct_9fa48("17362") ? `` : (stryCov_9fa48("17362"), `/api/zones/${id}`), stryMutAct_9fa48("17363") ? {} : (stryCov_9fa48("17363"), {
            method: stryMutAct_9fa48("17364") ? "" : (stryCov_9fa48("17364"), "PATCH"),
            headers: stryMutAct_9fa48("17365") ? {} : (stryCov_9fa48("17365"), {
              "content-type": stryMutAct_9fa48("17366") ? "" : (stryCov_9fa48("17366"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17367")) {
          {}
        } else {
          stryCov_9fa48("17367");
          if (stryMutAct_9fa48("17369") ? false : stryMutAct_9fa48("17368") ? true : (stryCov_9fa48("17368", "17369"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17370")) {
              {}
            } else {
              stryCov_9fa48("17370");
              recordTelemetryEvent(stryMutAct_9fa48("17372") ? {} : (stryCov_9fa48("17372"), {
                name: stryMutAct_9fa48("17373") ? "" : (stryCov_9fa48("17373"), "request_network_failure"),
                resource: stryMutAct_9fa48("17374") ? "" : (stryCov_9fa48("17374"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response);
    }
  },
  async delete(id: string): Promise<Zone> {
    if (stryMutAct_9fa48("17375")) {
      {}
    } else {
      stryCov_9fa48("17375");
      let response: Response;
      try {
        if (stryMutAct_9fa48("17376")) {
          {}
        } else {
          stryCov_9fa48("17376");
          response = await authenticatedFetch(stryMutAct_9fa48("17377") ? `` : (stryCov_9fa48("17377"), `/api/zones/${id}`), stryMutAct_9fa48("17378") ? {} : (stryCov_9fa48("17378"), {
            method: stryMutAct_9fa48("17379") ? "" : (stryCov_9fa48("17379"), "DELETE")
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17380")) {
          {}
        } else {
          stryCov_9fa48("17380");
          if (stryMutAct_9fa48("17382") ? false : stryMutAct_9fa48("17381") ? true : (stryCov_9fa48("17381", "17382"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17383")) {
              {}
            } else {
              stryCov_9fa48("17383");
              recordTelemetryEvent(stryMutAct_9fa48("17385") ? {} : (stryCov_9fa48("17385"), {
                name: stryMutAct_9fa48("17386") ? "" : (stryCov_9fa48("17386"), "request_network_failure"),
                resource: stryMutAct_9fa48("17387") ? "" : (stryCov_9fa48("17387"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response);
    }
  },
  async assignNeighborhoods(id: string, input: AssignNeighborhoodsInput): Promise<Zone> {
    if (stryMutAct_9fa48("17388")) {
      {}
    } else {
      stryCov_9fa48("17388");
      const validated = assignNeighborhoodsInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("17389")) {
          {}
        } else {
          stryCov_9fa48("17389");
          response = await authenticatedFetch(stryMutAct_9fa48("17390") ? `` : (stryCov_9fa48("17390"), `/api/zones/${id}/neighborhoods`), stryMutAct_9fa48("17391") ? {} : (stryCov_9fa48("17391"), {
            method: stryMutAct_9fa48("17392") ? "" : (stryCov_9fa48("17392"), "POST"),
            headers: stryMutAct_9fa48("17393") ? {} : (stryCov_9fa48("17393"), {
              "content-type": stryMutAct_9fa48("17394") ? "" : (stryCov_9fa48("17394"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17395")) {
          {}
        } else {
          stryCov_9fa48("17395");
          if (stryMutAct_9fa48("17397") ? false : stryMutAct_9fa48("17396") ? true : (stryCov_9fa48("17396", "17397"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17398")) {
              {}
            } else {
              stryCov_9fa48("17398");
              recordTelemetryEvent(stryMutAct_9fa48("17400") ? {} : (stryCov_9fa48("17400"), {
                name: stryMutAct_9fa48("17401") ? "" : (stryCov_9fa48("17401"), "request_network_failure"),
                resource: stryMutAct_9fa48("17402") ? "" : (stryCov_9fa48("17402"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response, stryMutAct_9fa48("17403") ? "" : (stryCov_9fa48("17403"), "zones"));
    }
  },
  async removeNeighborhood(id: string, neighborhoodId: string): Promise<Zone> {
    if (stryMutAct_9fa48("17404")) {
      {}
    } else {
      stryCov_9fa48("17404");
      let response: Response;
      try {
        if (stryMutAct_9fa48("17405")) {
          {}
        } else {
          stryCov_9fa48("17405");
          response = await authenticatedFetch(stryMutAct_9fa48("17406") ? `` : (stryCov_9fa48("17406"), `/api/zones/${id}/neighborhoods/${encodeURIComponent(neighborhoodId)}`), stryMutAct_9fa48("17407") ? {} : (stryCov_9fa48("17407"), {
            method: stryMutAct_9fa48("17408") ? "" : (stryCov_9fa48("17408"), "DELETE")
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17409")) {
          {}
        } else {
          stryCov_9fa48("17409");
          if (stryMutAct_9fa48("17411") ? false : stryMutAct_9fa48("17410") ? true : (stryCov_9fa48("17410", "17411"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17412")) {
              {}
            } else {
              stryCov_9fa48("17412");
              recordTelemetryEvent(stryMutAct_9fa48("17414") ? {} : (stryCov_9fa48("17414"), {
                name: stryMutAct_9fa48("17415") ? "" : (stryCov_9fa48("17415"), "request_network_failure"),
                resource: stryMutAct_9fa48("17416") ? "" : (stryCov_9fa48("17416"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleZoneResponse(response, stryMutAct_9fa48("17417") ? "" : (stryCov_9fa48("17417"), "zones"));
    }
  },
  async checkReferences(id: string): Promise<ZoneReferenceReport> {
    if (stryMutAct_9fa48("17418")) {
      {}
    } else {
      stryCov_9fa48("17418");
      let response: Response;
      try {
        if (stryMutAct_9fa48("17419")) {
          {}
        } else {
          stryCov_9fa48("17419");
          response = await authenticatedFetch(stryMutAct_9fa48("17420") ? `` : (stryCov_9fa48("17420"), `/api/zones/${id}/references`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("17421")) {
          {}
        } else {
          stryCov_9fa48("17421");
          if (stryMutAct_9fa48("17423") ? false : stryMutAct_9fa48("17422") ? true : (stryCov_9fa48("17422", "17423"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("17424")) {
              {}
            } else {
              stryCov_9fa48("17424");
              recordTelemetryEvent(stryMutAct_9fa48("17426") ? {} : (stryCov_9fa48("17426"), {
                name: stryMutAct_9fa48("17427") ? "" : (stryCov_9fa48("17427"), "request_network_failure"),
                resource: stryMutAct_9fa48("17428") ? "" : (stryCov_9fa48("17428"), "zones")
              }));
            }
          }
          throw cause;
        }
      }
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("17431") ? false : stryMutAct_9fa48("17430") ? true : stryMutAct_9fa48("17429") ? response.ok : (stryCov_9fa48("17429", "17430", "17431"), !response.ok)) {
        if (stryMutAct_9fa48("17432")) {
          {}
        } else {
          stryCov_9fa48("17432");
          if (stryMutAct_9fa48("17433")) {
            ;
          } else {
            stryCov_9fa48("17433");
            handleErrorPayload(payload);
          }
        }
      }
      const parsed = zoneReferenceReportSchema.safeParse(payload);
      if (stryMutAct_9fa48("17436") ? false : stryMutAct_9fa48("17435") ? true : stryMutAct_9fa48("17434") ? parsed.success : (stryCov_9fa48("17434", "17435", "17436"), !parsed.success)) {
        if (stryMutAct_9fa48("17437")) {
          {}
        } else {
          stryCov_9fa48("17437");
          recordTelemetryEvent(stryMutAct_9fa48("17439") ? {} : (stryCov_9fa48("17439"), {
            name: stryMutAct_9fa48("17440") ? "" : (stryCov_9fa48("17440"), "request_malformed_response"),
            resource: stryMutAct_9fa48("17441") ? "" : (stryCov_9fa48("17441"), "zones")
          }));
          throw new ZoneContractError(stryMutAct_9fa48("17443") ? "" : (stryCov_9fa48("17443"), "No se pudo obtener información válida de referencias de zona. Reintente en unos segundos."), stryMutAct_9fa48("17444") ? {} : (stryCov_9fa48("17444"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  }
});