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
import { backendMode, backendQuery, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { filterNeighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { booleanParam, MAX_SEARCH_LENGTH } from "@/lib/input-limits";
import { getRequiredSession } from "@/lib/session";

/** Catálogo de barrios de M9, leído por el backend de M6 (cacheado). El BFF no llama al Core ni tiene su token. */
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3165")) {
    {}
  } else {
    stryCov_9fa48("3165");
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (stryMutAct_9fa48("3166")) {
        {}
      } else {
        stryCov_9fa48("3166");
        const session = getRequiredSession(request);
        const query = stryMutAct_9fa48("3167") ? {} : (stryCov_9fa48("3167"), {
          soloActivos: booleanParam(url.searchParams, stryMutAct_9fa48("3168") ? "" : (stryCov_9fa48("3168"), "soloActivos")),
          zona: stryMutAct_9fa48("3171") ? url.searchParams.get("zona")?.slice(0, MAX_SEARCH_LENGTH) && undefined : stryMutAct_9fa48("3170") ? false : stryMutAct_9fa48("3169") ? true : (stryCov_9fa48("3169", "3170", "3171"), (stryMutAct_9fa48("3173") ? url.searchParams.get("zona").slice(0, MAX_SEARCH_LENGTH) : stryMutAct_9fa48("3172") ? url.searchParams.get("zona") : (stryCov_9fa48("3172", "3173"), url.searchParams.get(stryMutAct_9fa48("3174") ? "" : (stryCov_9fa48("3174"), "zona"))?.slice(0, MAX_SEARCH_LENGTH))) || undefined),
          q: stryMutAct_9fa48("3176") ? url.searchParams.get("q").slice(0, MAX_SEARCH_LENGTH) : stryMutAct_9fa48("3175") ? url.searchParams.get("q") : (stryCov_9fa48("3175", "3176"), url.searchParams.get(stryMutAct_9fa48("3177") ? "" : (stryCov_9fa48("3177"), "q"))?.slice(0, MAX_SEARCH_LENGTH))
        });
        if (stryMutAct_9fa48("3179") ? false : stryMutAct_9fa48("3178") ? true : (stryCov_9fa48("3178", "3179"), backendMode(session))) {
          if (stryMutAct_9fa48("3180")) {
            {}
          } else {
            stryCov_9fa48("3180");
            return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("3181") ? `` : (stryCov_9fa48("3181"), `/neighborhoods${backendQuery(query, stryMutAct_9fa48("3182") ? [] : (stryCov_9fa48("3182"), [stryMutAct_9fa48("3183") ? "" : (stryCov_9fa48("3183"), "soloActivos"), stryMutAct_9fa48("3184") ? "" : (stryCov_9fa48("3184"), "zona"), stryMutAct_9fa48("3185") ? "" : (stryCov_9fa48("3185"), "q")]))}`)));
          }
        }
        return NextResponse.json(filterNeighborhoodFixtures(query));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3186")) {
        {}
      } else {
        stryCov_9fa48("3186");
        return handleRouteError(error, path, stryMutAct_9fa48("3187") ? "" : (stryCov_9fa48("3187"), "No se pudieron cargar los barrios."));
      }
    }
  }
}