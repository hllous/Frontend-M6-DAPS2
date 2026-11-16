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
import { authorize, backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { updateServiceFixture } from "@/lib/services-fixtures";
import { STATUS_LABEL, suspendServiceRequestSchema, toSuspendServiceBackendInput } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5215")) {
    {}
  } else {
    stryCov_9fa48("5215");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5216")) {
        {}
      } else {
        stryCov_9fa48("5216");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);

        // Permission check: only actors with service:execute capability (Crew Leader of the assigned crew)
        authorize(session, stryMutAct_9fa48("5218") ? {} : (stryCov_9fa48("5218"), {
          capability: stryMutAct_9fa48("5219") ? "" : (stryCov_9fa48("5219"), "service:execute"),
          capabilityMessage: stryMutAct_9fa48("5220") ? "" : (stryCov_9fa48("5220"), "No tiene permisos para suspender el servicio. Solo la persona responsable de la cuadrilla puede hacerlo."),
          throwOnError: stryMutAct_9fa48("5221") ? false : (stryCov_9fa48("5221"), true)
        }));
        const parsed = await parseJsonBody(request, suspendServiceRequestSchema, path);
        if (stryMutAct_9fa48("5223") ? false : stryMutAct_9fa48("5222") ? true : (stryCov_9fa48("5222", "5223"), parsed instanceof Response)) return parsed;
        const input = parsed.data;
        if (stryMutAct_9fa48("5225") ? false : stryMutAct_9fa48("5224") ? true : (stryCov_9fa48("5224", "5225"), backendMode(session))) {
          if (stryMutAct_9fa48("5226")) {
            {}
          } else {
            stryCov_9fa48("5226");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5227") ? {} : (stryCov_9fa48("5227"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5229") ? false : stryMutAct_9fa48("5228") ? true : (stryCov_9fa48("5228", "5229"), scopedService instanceof Response)) return scopedService;
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5230") ? `` : (stryCov_9fa48("5230"), `/services/${pathId(serviceId)}/suspend`), undefined, stryMutAct_9fa48("5231") ? {} : (stryCov_9fa48("5231"), {
              method: stryMutAct_9fa48("5232") ? "" : (stryCov_9fa48("5232"), "POST"),
              headers: stryMutAct_9fa48("5233") ? {} : (stryCov_9fa48("5233"), {
                "content-type": stryMutAct_9fa48("5234") ? "" : (stryCov_9fa48("5234"), "application/json")
              }),
              body: JSON.stringify(toSuspendServiceBackendInput(input))
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5236") ? false : stryMutAct_9fa48("5235") ? true : (stryCov_9fa48("5235", "5236"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5239") ? scenario.actor.kind === "FIELD" && scenario.actor.crewId || service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("5238") ? false : stryMutAct_9fa48("5237") ? true : (stryCov_9fa48("5237", "5238", "5239"), (stryMutAct_9fa48("5241") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5240") ? true : (stryCov_9fa48("5240", "5241"), (stryMutAct_9fa48("5243") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5242") ? true : (stryCov_9fa48("5242", "5243"), scenario.actor.kind === (stryMutAct_9fa48("5244") ? "" : (stryCov_9fa48("5244"), "FIELD")))) && scenario.actor.crewId)) && (stryMutAct_9fa48("5246") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5245") ? true : (stryCov_9fa48("5245", "5246"), service.crewId !== scenario.actor.crewId)))) {
          if (stryMutAct_9fa48("5247")) {
            {}
          } else {
            stryCov_9fa48("5247");
            return errorResponse(403, stryMutAct_9fa48("5248") ? "" : (stryCov_9fa48("5248"), "Solo la cuadrilla asignada al servicio puede suspenderlo."), path);
          }
        }
        if (stryMutAct_9fa48("5251") ? service.status === "IN_PROGRESS" : stryMutAct_9fa48("5250") ? false : stryMutAct_9fa48("5249") ? true : (stryCov_9fa48("5249", "5250", "5251"), service.status !== (stryMutAct_9fa48("5252") ? "" : (stryCov_9fa48("5252"), "IN_PROGRESS")))) {
          if (stryMutAct_9fa48("5253")) {
            {}
          } else {
            stryCov_9fa48("5253");
            return errorResponse(409, stryMutAct_9fa48("5254") ? `` : (stryCov_9fa48("5254"), `Solo se pueden suspender servicios en curso (estado actual: ${STATUS_LABEL[service.status]}).`), path);
          }
        }
        const {
          reason: statusReason,
          note: statusNote
        } = toSuspendServiceBackendInput(input);
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("5255") ? {} : (stryCov_9fa48("5255"), {
          status: stryMutAct_9fa48("5256") ? "" : (stryCov_9fa48("5256"), "SUSPENDED"),
          statusReason,
          statusNote: stryMutAct_9fa48("5257") ? statusNote && null : (stryCov_9fa48("5257"), statusNote ?? null),
          history: stryMutAct_9fa48("5258") ? [] : (stryCov_9fa48("5258"), [...service.history, serviceHistoryEntry(stryMutAct_9fa48("5259") ? "" : (stryCov_9fa48("5259"), "Suspendido"))])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("5260") ? {} : (stryCov_9fa48("5260"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5261")) {
        {}
      } else {
        stryCov_9fa48("5261");
        return handleRouteError(error, path, stryMutAct_9fa48("5262") ? "" : (stryCov_9fa48("5262"), "No se pudo suspender el servicio."));
      }
    }
  }
}