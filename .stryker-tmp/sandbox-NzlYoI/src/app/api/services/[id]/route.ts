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
import { findServiceFixture } from "@/lib/bff-service-mock";
import { backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5102")) {
    {}
  } else {
    stryCov_9fa48("5102");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5103")) {
        {}
      } else {
        stryCov_9fa48("5103");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("5105") ? false : stryMutAct_9fa48("5104") ? true : (stryCov_9fa48("5104", "5105"), backendMode(session))) {
          if (stryMutAct_9fa48("5106")) {
            {}
          } else {
            stryCov_9fa48("5106");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5107") ? {} : (stryCov_9fa48("5107"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5109") ? false : stryMutAct_9fa48("5108") ? true : (stryCov_9fa48("5108", "5109"), scopedService instanceof Response)) return scopedService;
            if (stryMutAct_9fa48("5111") ? false : stryMutAct_9fa48("5110") ? true : (stryCov_9fa48("5110", "5111"), scopedService)) return NextResponse.json(scopedService);
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5112") ? `` : (stryCov_9fa48("5112"), `/services/${pathId(serviceId)}`));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5114") ? false : stryMutAct_9fa48("5113") ? true : (stryCov_9fa48("5113", "5114"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5117") ? scenario.actor.kind === "FIELD" && scenario.actor.crewId || service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("5116") ? false : stryMutAct_9fa48("5115") ? true : (stryCov_9fa48("5115", "5116", "5117"), (stryMutAct_9fa48("5119") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5118") ? true : (stryCov_9fa48("5118", "5119"), (stryMutAct_9fa48("5121") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5120") ? true : (stryCov_9fa48("5120", "5121"), scenario.actor.kind === (stryMutAct_9fa48("5122") ? "" : (stryCov_9fa48("5122"), "FIELD")))) && scenario.actor.crewId)) && (stryMutAct_9fa48("5124") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5123") ? true : (stryCov_9fa48("5123", "5124"), service.crewId !== scenario.actor.crewId)))) {
          if (stryMutAct_9fa48("5125")) {
            {}
          } else {
            stryCov_9fa48("5125");
            return errorResponse(403, stryMutAct_9fa48("5126") ? "" : (stryCov_9fa48("5126"), "El servicio no pertenece a la cuadrilla asignada a este usuario."), path);
          }
        }
        return NextResponse.json(service, stryMutAct_9fa48("5127") ? {} : (stryCov_9fa48("5127"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5128")) {
        {}
      } else {
        stryCov_9fa48("5128");
        return handleRouteError(error, path, stryMutAct_9fa48("5129") ? "" : (stryCov_9fa48("5129"), "No se pudo cargar el servicio."));
      }
    }
  }
}