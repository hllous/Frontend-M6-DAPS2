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
import { backendQuery } from "@/lib/bff-route";
import { argentinaDay } from "@/lib/argentina-date";
import { fetchPublicBackend, publicMockMode, relayPublicResponse, withCacheControl } from "@/lib/public-bff";
import { queryPublicServiceFixtures } from "@/lib/public-service-fixtures";
import { PUBLIC_SERVICES_QUERY_KEYS, publicServicesPageSchema } from "@/lib/public-services";
function positiveInt(value: string | null): number | undefined {
  if (stryMutAct_9fa48("3205")) {
    {}
  } else {
    stryCov_9fa48("3205");
    const parsed = Number(value);
    return (stryMutAct_9fa48("3208") ? Number.isInteger(parsed) || parsed > 0 : stryMutAct_9fa48("3207") ? false : stryMutAct_9fa48("3206") ? true : (stryCov_9fa48("3206", "3207", "3208"), Number.isInteger(parsed) && (stryMutAct_9fa48("3211") ? parsed <= 0 : stryMutAct_9fa48("3210") ? parsed >= 0 : stryMutAct_9fa48("3209") ? true : (stryCov_9fa48("3209", "3210", "3211"), parsed > 0)))) ? parsed : undefined;
  }
}

// Los servicios cambian de etapa durante el día: nunca se cachean.
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3212")) {
    {}
  } else {
    stryCov_9fa48("3212");
    const url = new URL(request.url);
    if (stryMutAct_9fa48("3214") ? false : stryMutAct_9fa48("3213") ? true : (stryCov_9fa48("3213", "3214"), publicMockMode())) {
      if (stryMutAct_9fa48("3215")) {
        {}
      } else {
        stryCov_9fa48("3215");
        const today = stryMutAct_9fa48("3216") ? argentinaDay(new Date().toISOString()) && "" : (stryCov_9fa48("3216"), argentinaDay(new Date().toISOString()) ?? (stryMutAct_9fa48("3217") ? "Stryker was here!" : (stryCov_9fa48("3217"), "")));
        const page = queryPublicServiceFixtures(today, stryMutAct_9fa48("3218") ? {} : (stryCov_9fa48("3218"), {
          zoneId: stryMutAct_9fa48("3219") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("3219"), url.searchParams.get(stryMutAct_9fa48("3220") ? "" : (stryCov_9fa48("3220"), "zoneId")) ?? undefined),
          from: stryMutAct_9fa48("3221") ? url.searchParams.get("from") && undefined : (stryCov_9fa48("3221"), url.searchParams.get(stryMutAct_9fa48("3222") ? "" : (stryCov_9fa48("3222"), "from")) ?? undefined),
          to: stryMutAct_9fa48("3223") ? url.searchParams.get("to") && undefined : (stryCov_9fa48("3223"), url.searchParams.get(stryMutAct_9fa48("3224") ? "" : (stryCov_9fa48("3224"), "to")) ?? undefined),
          page: positiveInt(url.searchParams.get(stryMutAct_9fa48("3225") ? "" : (stryCov_9fa48("3225"), "page"))),
          pageSize: positiveInt(url.searchParams.get(stryMutAct_9fa48("3226") ? "" : (stryCov_9fa48("3226"), "pageSize")))
        }));
        return withCacheControl(NextResponse.json(page));
      }
    }
    const query = backendQuery(Object.fromEntries(url.searchParams), PUBLIC_SERVICES_QUERY_KEYS);
    const response = await fetchPublicBackend(request, stryMutAct_9fa48("3227") ? `` : (stryCov_9fa48("3227"), `/public/services${query}`));
    return relayPublicResponse(response, url.pathname, publicServicesPageSchema);
  }
}