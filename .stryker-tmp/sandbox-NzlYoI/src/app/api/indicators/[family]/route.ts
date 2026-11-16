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
import { NextResponse } from "next/server";
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { indicatorFixtureResponse } from "@/lib/indicator-fixtures";
import { familyAppliesCatalogFilters, indicatorBucketSchema, indicatorQueryErrorMessage, indicatorQuerySchema } from "@/lib/indicators";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
const families = ["coverage", "compliance", "incidents", "waste"] as const;
type IndicatorFamily = typeof families[number];
function queryString(request: Request, family: IndicatorFamily) {
  if (stryMutAct_9fa48("3000")) {
    {}
  } else {
    stryCov_9fa48("3000");
    const url = new URL(request.url);
    const raw = stryMutAct_9fa48("3001") ? {} : (stryCov_9fa48("3001"), {
      from: stryMutAct_9fa48("3002") ? url.searchParams.get("from") && undefined : (stryCov_9fa48("3002"), url.searchParams.get(stryMutAct_9fa48("3003") ? "" : (stryCov_9fa48("3003"), "from")) ?? undefined),
      to: stryMutAct_9fa48("3004") ? url.searchParams.get("to") && undefined : (stryCov_9fa48("3004"), url.searchParams.get(stryMutAct_9fa48("3005") ? "" : (stryCov_9fa48("3005"), "to")) ?? undefined),
      zoneId: stryMutAct_9fa48("3006") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("3006"), url.searchParams.get(stryMutAct_9fa48("3007") ? "" : (stryCov_9fa48("3007"), "zoneId")) ?? undefined),
      serviceTypeId: stryMutAct_9fa48("3008") ? url.searchParams.get("serviceTypeId") && undefined : (stryCov_9fa48("3008"), url.searchParams.get(stryMutAct_9fa48("3009") ? "" : (stryCov_9fa48("3009"), "serviceTypeId")) ?? undefined)
    });
    const parsed = indicatorQuerySchema.safeParse(raw);
    if (stryMutAct_9fa48("3012") ? false : stryMutAct_9fa48("3011") ? true : stryMutAct_9fa48("3010") ? parsed.success : (stryCov_9fa48("3010", "3011", "3012"), !parsed.success)) return {
      error: indicatorQueryErrorMessage(parsed.error)
    } as const;
    const allowedKeys = familyAppliesCatalogFilters(family) ? stryMutAct_9fa48("3013") ? [] : (stryCov_9fa48("3013"), [stryMutAct_9fa48("3014") ? "" : (stryCov_9fa48("3014"), "from"), stryMutAct_9fa48("3015") ? "" : (stryCov_9fa48("3015"), "to"), stryMutAct_9fa48("3016") ? "" : (stryCov_9fa48("3016"), "zoneId"), stryMutAct_9fa48("3017") ? "" : (stryCov_9fa48("3017"), "serviceTypeId")]) : stryMutAct_9fa48("3018") ? [] : (stryCov_9fa48("3018"), [stryMutAct_9fa48("3019") ? "" : (stryCov_9fa48("3019"), "from"), stryMutAct_9fa48("3020") ? "" : (stryCov_9fa48("3020"), "to")]);
    const bucketValue = url.searchParams.get(stryMutAct_9fa48("3021") ? "" : (stryCov_9fa48("3021"), "bucket"));
    const bucket = (stryMutAct_9fa48("3024") ? bucketValue !== null : stryMutAct_9fa48("3023") ? false : stryMutAct_9fa48("3022") ? true : (stryCov_9fa48("3022", "3023", "3024"), bucketValue === null)) ? undefined : indicatorBucketSchema.safeParse(bucketValue);
    const compare = url.searchParams.get(stryMutAct_9fa48("3025") ? "" : (stryCov_9fa48("3025"), "compare"));
    if (stryMutAct_9fa48("3028") ? bucket || !bucket.success : stryMutAct_9fa48("3027") ? false : stryMutAct_9fa48("3026") ? true : (stryCov_9fa48("3026", "3027", "3028"), bucket && (stryMutAct_9fa48("3029") ? bucket.success : (stryCov_9fa48("3029"), !bucket.success)))) return {
      error: "Intervalo de indicadores inválido."
    } as const;
    if (stryMutAct_9fa48("3032") ? compare || compare !== "previous" : stryMutAct_9fa48("3031") ? false : stryMutAct_9fa48("3030") ? true : (stryCov_9fa48("3030", "3031", "3032"), compare && (stryMutAct_9fa48("3034") ? compare === "previous" : stryMutAct_9fa48("3033") ? true : (stryCov_9fa48("3033", "3034"), compare !== (stryMutAct_9fa48("3035") ? "" : (stryCov_9fa48("3035"), "previous")))))) return {
      error: "Comparación de indicadores inválida."
    } as const;
    const query = backendQuery(parsed.data, allowedKeys);
    const params = new URLSearchParams((stryMutAct_9fa48("3036") ? query.endsWith("?") : (stryCov_9fa48("3036"), query.startsWith(stryMutAct_9fa48("3037") ? "" : (stryCov_9fa48("3037"), "?")))) ? stryMutAct_9fa48("3038") ? query : (stryCov_9fa48("3038"), query.slice(1)) : query);
    if (stryMutAct_9fa48("3041") ? bucket.success : stryMutAct_9fa48("3040") ? false : stryMutAct_9fa48("3039") ? true : (stryCov_9fa48("3039", "3040", "3041"), bucket?.success)) params.set(stryMutAct_9fa48("3043") ? "" : (stryCov_9fa48("3043"), "bucket"), bucket.data);
    if (stryMutAct_9fa48("3045") ? false : stryMutAct_9fa48("3044") ? true : (stryCov_9fa48("3044", "3045"), compare)) params.set(stryMutAct_9fa48("3047") ? "" : (stryCov_9fa48("3047"), "compare"), compare);
    return {
      value: `?${params.toString()}`
    } as const;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    family: string;
  }>;
}) {
  if (stryMutAct_9fa48("3048")) {
    {}
  } else {
    stryCov_9fa48("3048");
    const {
      family
    } = await context.params;
    const path = new URL(request.url).pathname;
    if (stryMutAct_9fa48("3051") ? false : stryMutAct_9fa48("3050") ? true : stryMutAct_9fa48("3049") ? families.includes(family as IndicatorFamily) : (stryCov_9fa48("3049", "3050", "3051"), !families.includes(family as IndicatorFamily))) return errorResponse(404, stryMutAct_9fa48("3052") ? "" : (stryCov_9fa48("3052"), "Familia de indicadores no encontrada."), path);
    const typedFamily = family as IndicatorFamily;
    try {
      if (stryMutAct_9fa48("3053")) {
        {}
      } else {
        stryCov_9fa48("3053");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("3055") ? {} : (stryCov_9fa48("3055"), {
          capability: stryMutAct_9fa48("3056") ? "" : (stryCov_9fa48("3056"), "indicator:view"),
          throwOnError: stryMutAct_9fa48("3057") ? false : (stryCov_9fa48("3057"), true)
        }));
        const query = queryString(request, typedFamily);
        if (stryMutAct_9fa48("3060") ? "error" in query || query.error : stryMutAct_9fa48("3059") ? false : stryMutAct_9fa48("3058") ? true : (stryCov_9fa48("3058", "3059", "3060"), (stryMutAct_9fa48("3061") ? "" : (stryCov_9fa48("3061"), "error")) in query && query.error)) return errorResponse(400, query.error, path);
        if (stryMutAct_9fa48("3063") ? false : stryMutAct_9fa48("3062") ? true : (stryCov_9fa48("3062", "3063"), backendMode(session))) {
          if (stryMutAct_9fa48("3064")) {
            {}
          } else {
            stryCov_9fa48("3064");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3065") ? `` : (stryCov_9fa48("3065"), `/indicators/${typedFamily}${query.value}`), stryMutAct_9fa48("3066") ? "" : (stryCov_9fa48("3066"), "indicator:view"));
            return forwardResponse(backendResponse);
          }
        }
        const fixture = indicatorFixtureResponse(typedFamily, request);
        if (stryMutAct_9fa48("3068") ? false : stryMutAct_9fa48("3067") ? true : (stryCov_9fa48("3067", "3068"), fixture.error)) return errorResponse(400, fixture.error, path);
        return NextResponse.json(fixture);
      }
    } catch (error) {
      if (stryMutAct_9fa48("3069")) {
        {}
      } else {
        stryCov_9fa48("3069");
        if (stryMutAct_9fa48("3071") ? false : stryMutAct_9fa48("3070") ? true : (stryCov_9fa48("3070", "3071"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3072") ? "" : (stryCov_9fa48("3072"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3074") ? false : stryMutAct_9fa48("3073") ? true : (stryCov_9fa48("3073", "3074"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("3075") ? "" : (stryCov_9fa48("3075"), "La sesión no tiene la capacidad indicator:view."), path, FORBIDDEN_CODES.roleRequired);
        if (stryMutAct_9fa48("3077") ? false : stryMutAct_9fa48("3076") ? true : (stryCov_9fa48("3076", "3077"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3078") ? "" : (stryCov_9fa48("3078"), "No se pudieron cargar los indicadores."));
      }
    }
  }
}