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
import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5954")) {
    {}
  } else {
    stryCov_9fa48("5954");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5955")) {
        {}
      } else {
        stryCov_9fa48("5955");
        const session = getRequiredSession(request);
        const {
          id
        } = await context.params;
        if (stryMutAct_9fa48("5957") ? false : stryMutAct_9fa48("5956") ? true : (stryCov_9fa48("5956", "5957"), backendMode(session))) {
          if (stryMutAct_9fa48("5958")) {
            {}
          } else {
            stryCov_9fa48("5958");
            const response = await fetchBackend(request, stryMutAct_9fa48("5959") ? `` : (stryCov_9fa48("5959"), `/tree-interventions/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const intervention = getTreeInterventionFixture(id);
        return intervention ? NextResponse.json(intervention) : errorResponse(404, stryMutAct_9fa48("5960") ? "" : (stryCov_9fa48("5960"), "Intervención de arbolado no encontrada."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("5961")) {
        {}
      } else {
        stryCov_9fa48("5961");
        if (stryMutAct_9fa48("5963") ? false : stryMutAct_9fa48("5962") ? true : (stryCov_9fa48("5962", "5963"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5964") ? "" : (stryCov_9fa48("5964"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5966") ? false : stryMutAct_9fa48("5965") ? true : (stryCov_9fa48("5965", "5966"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5967") ? "" : (stryCov_9fa48("5967"), "No se pudo cargar el detalle de la intervención."));
      }
    }
  }
}