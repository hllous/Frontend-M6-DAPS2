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
import { booleanParam } from "@/lib/input-limits";
import { communeFixtures } from "@/lib/neighborhoods-fixtures";
import { getRequiredSession } from "@/lib/session";
export async function GET(request: Request) {
  if (stryMutAct_9fa48("142")) {
    {}
  } else {
    stryCov_9fa48("142");
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (stryMutAct_9fa48("143")) {
        {}
      } else {
        stryCov_9fa48("143");
        const session = getRequiredSession(request);
        const active = booleanParam(url.searchParams, stryMutAct_9fa48("144") ? "" : (stryCov_9fa48("144"), "active"));
        if (stryMutAct_9fa48("146") ? false : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146"), backendMode(session))) {
          if (stryMutAct_9fa48("147")) {
            {}
          } else {
            stryCov_9fa48("147");
            return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("148") ? `` : (stryCov_9fa48("148"), `/communes${backendQuery(stryMutAct_9fa48("149") ? {} : (stryCov_9fa48("149"), {
              active
            }), stryMutAct_9fa48("150") ? [] : (stryCov_9fa48("150"), [stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), "active")]))}`)));
          }
        }
        return NextResponse.json(communeFixtures(active));
      }
    } catch (error) {
      if (stryMutAct_9fa48("152")) {
        {}
      } else {
        stryCov_9fa48("152");
        return handleRouteError(error, path, stryMutAct_9fa48("153") ? "" : (stryCov_9fa48("153"), "No se pudieron cargar las comunas."));
      }
    }
  }
}