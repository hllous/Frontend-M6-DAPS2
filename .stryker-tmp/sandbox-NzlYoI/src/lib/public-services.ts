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
import { serviceTypeCategorySchema } from "./service-types";

/** Contratos públicos de zonas y servicios (`GET /public/zones`, `GET /public/services`). Solo lo que el backend publica. */
export const publicZoneSchema = z.object(stryMutAct_9fa48("12529") ? {} : (stryCov_9fa48("12529"), {
  id: z.string(),
  code: z.string(),
  name: z.string()
}));
export type PublicZone = z.infer<typeof publicZoneSchema>;
export const publicZonesSchema = z.array(publicZoneSchema);
export const publicServiceStageSchema = z.enum(stryMutAct_9fa48("12530") ? [] : (stryCov_9fa48("12530"), [stryMutAct_9fa48("12531") ? "" : (stryCov_9fa48("12531"), "PROGRAMADO"), stryMutAct_9fa48("12532") ? "" : (stryCov_9fa48("12532"), "EN_CURSO"), stryMutAct_9fa48("12533") ? "" : (stryCov_9fa48("12533"), "REALIZADO"), stryMutAct_9fa48("12534") ? "" : (stryCov_9fa48("12534"), "REPROGRAMADO")]));
export type PublicServiceStage = z.infer<typeof publicServiceStageSchema>;
export const PUBLIC_SERVICE_STAGE_LABELS: Record<PublicServiceStage, string> = stryMutAct_9fa48("12535") ? {} : (stryCov_9fa48("12535"), {
  PROGRAMADO: stryMutAct_9fa48("12536") ? "" : (stryCov_9fa48("12536"), "Programado"),
  EN_CURSO: stryMutAct_9fa48("12537") ? "" : (stryCov_9fa48("12537"), "En curso"),
  REALIZADO: stryMutAct_9fa48("12538") ? "" : (stryCov_9fa48("12538"), "Realizado"),
  REPROGRAMADO: stryMutAct_9fa48("12539") ? "" : (stryCov_9fa48("12539"), "Reprogramado")
});
export const publicServiceSchema = z.object(stryMutAct_9fa48("12540") ? {} : (stryCov_9fa48("12540"), {
  id: z.string(),
  serviceTypeName: z.string(),
  category: serviceTypeCategorySchema,
  scheduledDate: z.string(),
  windowFrom: z.string().nullish(),
  windowTo: z.string().nullish(),
  stage: publicServiceStageSchema,
  zones: z.array(z.string())
}));
export type PublicService = z.infer<typeof publicServiceSchema>;
export const publicServicesPageSchema = z.object(stryMutAct_9fa48("12541") ? {} : (stryCov_9fa48("12541"), {
  data: z.array(publicServiceSchema),
  meta: z.object(stryMutAct_9fa48("12542") ? {} : (stryCov_9fa48("12542"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
export type PublicServicesPage = z.infer<typeof publicServicesPageSchema>;

/** Claves de consulta que el BFF público reenvía al backend para los servicios. */
export const PUBLIC_SERVICES_QUERY_KEYS = ["zoneId", "from", "to", "page", "pageSize"] as const;
export const PUBLIC_SERVICE_MESSAGES = {
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento."
} as const;
export type PublicLookupFailure = keyof typeof PUBLIC_SERVICE_MESSAGES;
export type PublicLookup<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  failure: PublicLookupFailure;
};
async function getPublic<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<PublicLookup<T>> {
  if (stryMutAct_9fa48("12543")) {
    {}
  } else {
    stryCov_9fa48("12543");
    let response: Response;
    try {
      if (stryMutAct_9fa48("12544")) {
        {}
      } else {
        stryCov_9fa48("12544");
        response = await fetch(url, stryMutAct_9fa48("12545") ? {} : (stryCov_9fa48("12545"), {
          signal,
          cache: stryMutAct_9fa48("12546") ? "" : (stryCov_9fa48("12546"), "no-store")
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("12547")) {
        {}
      } else {
        stryCov_9fa48("12547");
        if (stryMutAct_9fa48("12550") ? signal.aborted : stryMutAct_9fa48("12549") ? false : stryMutAct_9fa48("12548") ? true : (stryCov_9fa48("12548", "12549", "12550"), signal?.aborted)) throw error;
        return stryMutAct_9fa48("12551") ? {} : (stryCov_9fa48("12551"), {
          ok: stryMutAct_9fa48("12552") ? true : (stryCov_9fa48("12552"), false),
          failure: stryMutAct_9fa48("12553") ? "" : (stryCov_9fa48("12553"), "unavailable")
        });
      }
    }
    if (stryMutAct_9fa48("12556") ? response.status !== 429 : stryMutAct_9fa48("12555") ? false : stryMutAct_9fa48("12554") ? true : (stryCov_9fa48("12554", "12555", "12556"), response.status === 429)) return stryMutAct_9fa48("12557") ? {} : (stryCov_9fa48("12557"), {
      ok: stryMutAct_9fa48("12558") ? true : (stryCov_9fa48("12558"), false),
      failure: stryMutAct_9fa48("12559") ? "" : (stryCov_9fa48("12559"), "rateLimited")
    });
    if (stryMutAct_9fa48("12562") ? false : stryMutAct_9fa48("12561") ? true : stryMutAct_9fa48("12560") ? response.ok : (stryCov_9fa48("12560", "12561", "12562"), !response.ok)) return stryMutAct_9fa48("12563") ? {} : (stryCov_9fa48("12563"), {
      ok: stryMutAct_9fa48("12564") ? true : (stryCov_9fa48("12564"), false),
      failure: stryMutAct_9fa48("12565") ? "" : (stryCov_9fa48("12565"), "unavailable")
    });
    const parsed = schema.safeParse(await response.json().catch(() => undefined));
    return parsed.success ? stryMutAct_9fa48("12566") ? {} : (stryCov_9fa48("12566"), {
      ok: stryMutAct_9fa48("12567") ? false : (stryCov_9fa48("12567"), true),
      data: parsed.data
    }) : stryMutAct_9fa48("12568") ? {} : (stryCov_9fa48("12568"), {
      ok: stryMutAct_9fa48("12569") ? true : (stryCov_9fa48("12569"), false),
      failure: stryMutAct_9fa48("12570") ? "" : (stryCov_9fa48("12570"), "unavailable")
    });
  }
}
export function fetchPublicZones(signal?: AbortSignal) {
  if (stryMutAct_9fa48("12571")) {
    {}
  } else {
    stryCov_9fa48("12571");
    return getPublic(stryMutAct_9fa48("12572") ? "" : (stryCov_9fa48("12572"), "/api/public/zones"), publicZonesSchema, signal);
  }
}

/** Pide la primera página con el máximo de filas: la ventana por defecto del backend son los próximos 30 días. */
export function fetchPublicServices(zoneId: string, signal?: AbortSignal) {
  if (stryMutAct_9fa48("12573")) {
    {}
  } else {
    stryCov_9fa48("12573");
    const query = new URLSearchParams(stryMutAct_9fa48("12574") ? {} : (stryCov_9fa48("12574"), {
      zoneId,
      page: stryMutAct_9fa48("12575") ? "" : (stryCov_9fa48("12575"), "1"),
      pageSize: stryMutAct_9fa48("12576") ? "" : (stryCov_9fa48("12576"), "100")
    }));
    return getPublic(stryMutAct_9fa48("12577") ? `` : (stryCov_9fa48("12577"), `/api/public/services?${query}`), publicServicesPageSchema, signal);
  }
}

/** Agrupa por día de `scheduledDate` (YYYY-MM-DD), en orden de fecha y luego de hora de inicio. */
export function groupServicesByDate(services: readonly PublicService[]): {
  date: string;
  services: PublicService[];
}[] {
  if (stryMutAct_9fa48("12578")) {
    {}
  } else {
    stryCov_9fa48("12578");
    const groups = new Map<string, PublicService[]>();
    for (const service of services) {
      if (stryMutAct_9fa48("12579")) {
        {}
      } else {
        stryCov_9fa48("12579");
        const date = stryMutAct_9fa48("12580") ? service.scheduledDate : (stryCov_9fa48("12580"), service.scheduledDate.slice(0, 10));
        groups.set(date, stryMutAct_9fa48("12582") ? [] : (stryCov_9fa48("12582"), [...(stryMutAct_9fa48("12583") ? groups.get(date) && [] : (stryCov_9fa48("12583"), groups.get(date) ?? (stryMutAct_9fa48("12584") ? ["Stryker was here"] : (stryCov_9fa48("12584"), [])))), service]));
      }
    }
    return stryMutAct_9fa48("12585") ? [...groups.entries()].map(([date, items]) => ({
      date,
      services: items.sort((a, b) => (a.windowFrom ?? "99:99").localeCompare(b.windowFrom ?? "99:99"))
    })) : (stryCov_9fa48("12585"), (stryMutAct_9fa48("12586") ? [] : (stryCov_9fa48("12586"), [...groups.entries()])).sort(stryMutAct_9fa48("12587") ? () => undefined : (stryCov_9fa48("12587"), ([a], [b]) => a.localeCompare(b))).map(stryMutAct_9fa48("12588") ? () => undefined : (stryCov_9fa48("12588"), ([date, items]) => stryMutAct_9fa48("12589") ? {} : (stryCov_9fa48("12589"), {
      date,
      services: stryMutAct_9fa48("12590") ? items : (stryCov_9fa48("12590"), items.sort(stryMutAct_9fa48("12591") ? () => undefined : (stryCov_9fa48("12591"), (a, b) => (stryMutAct_9fa48("12592") ? a.windowFrom && "99:99" : (stryCov_9fa48("12592"), a.windowFrom ?? (stryMutAct_9fa48("12593") ? "" : (stryCov_9fa48("12593"), "99:99")))).localeCompare(stryMutAct_9fa48("12594") ? b.windowFrom && "99:99" : (stryCov_9fa48("12594"), b.windowFrom ?? (stryMutAct_9fa48("12595") ? "" : (stryCov_9fa48("12595"), "99:99")))))))
    }))));
  }
}