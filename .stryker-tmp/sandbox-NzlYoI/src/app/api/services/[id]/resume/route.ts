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
import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { updateServiceFixture } from "@/lib/services-fixtures";
import { STATUS_LABEL } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5059")) {
    {}
  } else {
    stryCov_9fa48("5059");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5060")) {
        {}
      } else {
        stryCov_9fa48("5060");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);

        // Permission check: only actors with service:execute capability (Crew Leader of the assigned crew)
        authorize(session, stryMutAct_9fa48("5062") ? {} : (stryCov_9fa48("5062"), {
          capability: stryMutAct_9fa48("5063") ? "" : (stryCov_9fa48("5063"), "service:execute"),
          capabilityMessage: stryMutAct_9fa48("5064") ? "" : (stryCov_9fa48("5064"), "No tiene permisos para reanudar el servicio. Solo la persona responsable de la cuadrilla puede hacerlo."),
          throwOnError: stryMutAct_9fa48("5065") ? false : (stryCov_9fa48("5065"), true)
        }));
        if (stryMutAct_9fa48("5067") ? false : stryMutAct_9fa48("5066") ? true : (stryCov_9fa48("5066", "5067"), backendMode(session))) {
          if (stryMutAct_9fa48("5068")) {
            {}
          } else {
            stryCov_9fa48("5068");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5069") ? {} : (stryCov_9fa48("5069"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5071") ? false : stryMutAct_9fa48("5070") ? true : (stryCov_9fa48("5070", "5071"), scopedService instanceof Response)) return scopedService;
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5072") ? `` : (stryCov_9fa48("5072"), `/services/${pathId(serviceId)}/resume`), undefined, stryMutAct_9fa48("5073") ? {} : (stryCov_9fa48("5073"), {
              method: stryMutAct_9fa48("5074") ? "" : (stryCov_9fa48("5074"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5076") ? false : stryMutAct_9fa48("5075") ? true : (stryCov_9fa48("5075", "5076"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5079") ? scenario.actor.kind === "FIELD" && scenario.actor.crewId || service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("5078") ? false : stryMutAct_9fa48("5077") ? true : (stryCov_9fa48("5077", "5078", "5079"), (stryMutAct_9fa48("5081") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5080") ? true : (stryCov_9fa48("5080", "5081"), (stryMutAct_9fa48("5083") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5082") ? true : (stryCov_9fa48("5082", "5083"), scenario.actor.kind === (stryMutAct_9fa48("5084") ? "" : (stryCov_9fa48("5084"), "FIELD")))) && scenario.actor.crewId)) && (stryMutAct_9fa48("5086") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5085") ? true : (stryCov_9fa48("5085", "5086"), service.crewId !== scenario.actor.crewId)))) {
          if (stryMutAct_9fa48("5087")) {
            {}
          } else {
            stryCov_9fa48("5087");
            return errorResponse(403, stryMutAct_9fa48("5088") ? "" : (stryCov_9fa48("5088"), "Solo la cuadrilla asignada al servicio puede reanudarlo."), path);
          }
        }
        if (stryMutAct_9fa48("5091") ? service.status === "SUSPENDED" : stryMutAct_9fa48("5090") ? false : stryMutAct_9fa48("5089") ? true : (stryCov_9fa48("5089", "5090", "5091"), service.status !== (stryMutAct_9fa48("5092") ? "" : (stryCov_9fa48("5092"), "SUSPENDED")))) {
          if (stryMutAct_9fa48("5093")) {
            {}
          } else {
            stryCov_9fa48("5093");
            return errorResponse(409, stryMutAct_9fa48("5094") ? `` : (stryCov_9fa48("5094"), `Solo se pueden reanudar servicios suspendidos (estado actual: ${STATUS_LABEL[service.status]}).`), path);
          }
        }
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("5095") ? {} : (stryCov_9fa48("5095"), {
          status: stryMutAct_9fa48("5096") ? "" : (stryCov_9fa48("5096"), "IN_PROGRESS"),
          statusReason: null,
          statusNote: null,
          history: stryMutAct_9fa48("5097") ? [] : (stryCov_9fa48("5097"), [...service.history, serviceHistoryEntry(stryMutAct_9fa48("5098") ? "" : (stryCov_9fa48("5098"), "Reanudado"))])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("5099") ? {} : (stryCov_9fa48("5099"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5100")) {
        {}
      } else {
        stryCov_9fa48("5100");
        return handleRouteError(error, path, stryMutAct_9fa48("5101") ? "" : (stryCov_9fa48("5101"), "No se pudo reanudar el servicio."));
      }
    }
  }
}