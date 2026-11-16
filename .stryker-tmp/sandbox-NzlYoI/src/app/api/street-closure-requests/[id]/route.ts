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
import { getStreetClosureRequestFixture } from "@/lib/street-closure-request-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5793")) {
    {}
  } else {
    stryCov_9fa48("5793");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5794")) {
        {}
      } else {
        stryCov_9fa48("5794");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("5797") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("5796") ? false : stryMutAct_9fa48("5795") ? true : (stryCov_9fa48("5795", "5796", "5797"), scenario.actor.kind !== (stryMutAct_9fa48("5798") ? "" : (stryCov_9fa48("5798"), "OFFICE")))) {
          if (stryMutAct_9fa48("5799")) {
            {}
          } else {
            stryCov_9fa48("5799");
            return errorResponse(403, stryMutAct_9fa48("5800") ? "" : (stryCov_9fa48("5800"), "Solo Oficina puede consultar solicitudes de corte de calle."), path);
          }
        }
        if (stryMutAct_9fa48("5802") ? false : stryMutAct_9fa48("5801") ? true : (stryCov_9fa48("5801", "5802"), backendMode(session))) {
          if (stryMutAct_9fa48("5803")) {
            {}
          } else {
            stryCov_9fa48("5803");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5804") ? `` : (stryCov_9fa48("5804"), `/street-closure-requests/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        const requestFixture = getStreetClosureRequestFixture(id);
        return requestFixture ? NextResponse.json(requestFixture) : errorResponse(404, stryMutAct_9fa48("5805") ? `` : (stryCov_9fa48("5805"), `Solicitud de corte de calle ${id} no encontrada.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("5806")) {
        {}
      } else {
        stryCov_9fa48("5806");
        if (stryMutAct_9fa48("5808") ? false : stryMutAct_9fa48("5807") ? true : (stryCov_9fa48("5807", "5808"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5809") ? "" : (stryCov_9fa48("5809"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5811") ? false : stryMutAct_9fa48("5810") ? true : (stryCov_9fa48("5810", "5811"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5812") ? "" : (stryCov_9fa48("5812"), "No se pudo cargar la solicitud de corte de calle."));
      }
    }
  }
}