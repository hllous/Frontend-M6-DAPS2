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
import { WASTE_TYPE_LABELS, wasteTypeSchema } from "./green-points";
import type { PublicLookup } from "./public-services";
export const publicGreenPointSchema = z.object(stryMutAct_9fa48("12410") ? {} : (stryCov_9fa48("12410"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullish(),
  lat: stryMutAct_9fa48("12412") ? z.number().finite().max(-90).max(90).nullish() : stryMutAct_9fa48("12411") ? z.number().finite().min(-90).min(90).nullish() : (stryCov_9fa48("12411", "12412"), z.number().finite().min(stryMutAct_9fa48("12413") ? +90 : (stryCov_9fa48("12413"), -90)).max(90).nullish()),
  lng: stryMutAct_9fa48("12415") ? z.number().finite().max(-180).max(180).nullish() : stryMutAct_9fa48("12414") ? z.number().finite().min(-180).min(180).nullish() : (stryCov_9fa48("12414", "12415"), z.number().finite().min(stryMutAct_9fa48("12416") ? +180 : (stryCov_9fa48("12416"), -180)).max(180).nullish()),
  zoneName: z.string(),
  wasteTypes: z.array(wasteTypeSchema)
}));
export type PublicGreenPoint = z.infer<typeof publicGreenPointSchema>;
export const publicGreenPointsPageSchema = z.object(stryMutAct_9fa48("12417") ? {} : (stryCov_9fa48("12417"), {
  data: z.array(publicGreenPointSchema),
  meta: z.object(stryMutAct_9fa48("12418") ? {} : (stryCov_9fa48("12418"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
export type PublicGreenPointsPage = z.infer<typeof publicGreenPointsPageSchema>;

/** El backend público solo filtra por zona; el filtro de residuos queda en el navegador. */
export const PUBLIC_GREEN_POINTS_QUERY_KEYS = ["zoneId", "page", "pageSize"] as const;
export const PUBLIC_GREEN_POINTS_CACHE_CONTROL = stryMutAct_9fa48("12419") ? "" : (stryCov_9fa48("12419"), "public, max-age=60");
export const PUBLIC_GREEN_POINT_MESSAGES = {
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento."
} as const;
export const PUBLIC_GREEN_POINT_WASTE_LABELS = WASTE_TYPE_LABELS;
export async function fetchPublicGreenPoints(zoneId: string, signal?: AbortSignal): Promise<PublicLookup<PublicGreenPointsPage>> {
  if (stryMutAct_9fa48("12420")) {
    {}
  } else {
    stryCov_9fa48("12420");
    const query = new URLSearchParams(stryMutAct_9fa48("12421") ? {} : (stryCov_9fa48("12421"), {
      zoneId,
      page: stryMutAct_9fa48("12422") ? "" : (stryCov_9fa48("12422"), "1"),
      pageSize: stryMutAct_9fa48("12423") ? "" : (stryCov_9fa48("12423"), "100")
    }));
    let response: Response;
    try {
      if (stryMutAct_9fa48("12424")) {
        {}
      } else {
        stryCov_9fa48("12424");
        response = await fetch(stryMutAct_9fa48("12425") ? `` : (stryCov_9fa48("12425"), `/api/public/green-points?${query}`), stryMutAct_9fa48("12426") ? {} : (stryCov_9fa48("12426"), {
          signal,
          cache: stryMutAct_9fa48("12427") ? "" : (stryCov_9fa48("12427"), "no-store")
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("12428")) {
        {}
      } else {
        stryCov_9fa48("12428");
        if (stryMutAct_9fa48("12431") ? signal.aborted : stryMutAct_9fa48("12430") ? false : stryMutAct_9fa48("12429") ? true : (stryCov_9fa48("12429", "12430", "12431"), signal?.aborted)) throw error;
        return stryMutAct_9fa48("12432") ? {} : (stryCov_9fa48("12432"), {
          ok: stryMutAct_9fa48("12433") ? true : (stryCov_9fa48("12433"), false),
          failure: stryMutAct_9fa48("12434") ? "" : (stryCov_9fa48("12434"), "unavailable")
        });
      }
    }
    if (stryMutAct_9fa48("12437") ? response.status !== 429 : stryMutAct_9fa48("12436") ? false : stryMutAct_9fa48("12435") ? true : (stryCov_9fa48("12435", "12436", "12437"), response.status === 429)) return stryMutAct_9fa48("12438") ? {} : (stryCov_9fa48("12438"), {
      ok: stryMutAct_9fa48("12439") ? true : (stryCov_9fa48("12439"), false),
      failure: stryMutAct_9fa48("12440") ? "" : (stryCov_9fa48("12440"), "rateLimited")
    });
    if (stryMutAct_9fa48("12443") ? false : stryMutAct_9fa48("12442") ? true : stryMutAct_9fa48("12441") ? response.ok : (stryCov_9fa48("12441", "12442", "12443"), !response.ok)) return stryMutAct_9fa48("12444") ? {} : (stryCov_9fa48("12444"), {
      ok: stryMutAct_9fa48("12445") ? true : (stryCov_9fa48("12445"), false),
      failure: stryMutAct_9fa48("12446") ? "" : (stryCov_9fa48("12446"), "unavailable")
    });
    const parsed = publicGreenPointsPageSchema.safeParse(await response.json().catch(() => undefined));
    return parsed.success ? stryMutAct_9fa48("12447") ? {} : (stryCov_9fa48("12447"), {
      ok: stryMutAct_9fa48("12448") ? false : (stryCov_9fa48("12448"), true),
      data: parsed.data
    }) : stryMutAct_9fa48("12449") ? {} : (stryCov_9fa48("12449"), {
      ok: stryMutAct_9fa48("12450") ? true : (stryCov_9fa48("12450"), false),
      failure: stryMutAct_9fa48("12451") ? "" : (stryCov_9fa48("12451"), "unavailable")
    });
  }
}