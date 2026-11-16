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
import { streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { SERVICE_TYPE_CATALOG } from "@/lib/services";
import { resolveStreetClosureDependency } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5130")) {
    {}
  } else {
    stryCov_9fa48("5130");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5131")) {
        {}
      } else {
        stryCov_9fa48("5131");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);

        // Permission check: only actors with service:execute capability (Crew Leader)
        authorize(session, stryMutAct_9fa48("5133") ? {} : (stryCov_9fa48("5133"), {
          capability: stryMutAct_9fa48("5134") ? "" : (stryCov_9fa48("5134"), "service:execute"),
          capabilityMessage: stryMutAct_9fa48("5135") ? "" : (stryCov_9fa48("5135"), "No tiene permisos para iniciar el servicio. Solo la persona responsable de la cuadrilla puede iniciar."),
          throwOnError: stryMutAct_9fa48("5136") ? false : (stryCov_9fa48("5136"), true)
        }));
        if (stryMutAct_9fa48("5138") ? false : stryMutAct_9fa48("5137") ? true : (stryCov_9fa48("5137", "5138"), backendMode(session))) {
          if (stryMutAct_9fa48("5139")) {
            {}
          } else {
            stryCov_9fa48("5139");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5140") ? {} : (stryCov_9fa48("5140"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5142") ? false : stryMutAct_9fa48("5141") ? true : (stryCov_9fa48("5141", "5142"), scopedService instanceof Response)) return scopedService;
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5143") ? `` : (stryCov_9fa48("5143"), `/services/${pathId(serviceId)}/start`), undefined, stryMutAct_9fa48("5144") ? {} : (stryCov_9fa48("5144"), {
              method: stryMutAct_9fa48("5145") ? "" : (stryCov_9fa48("5145"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5147") ? false : stryMutAct_9fa48("5146") ? true : (stryCov_9fa48("5146", "5147"), service instanceof Response)) return service;
        const closureDependency = resolveStreetClosureDependency(stryMutAct_9fa48("5148") ? streetClosureRequestFixtures : (stryCov_9fa48("5148"), streetClosureRequestFixtures.filter(stryMutAct_9fa48("5149") ? () => undefined : (stryCov_9fa48("5149"), closureRequest => stryMutAct_9fa48("5152") ? closureRequest.sourceType === "SERVICE" || closureRequest.sourceId === serviceId : stryMutAct_9fa48("5151") ? false : stryMutAct_9fa48("5150") ? true : (stryCov_9fa48("5150", "5151", "5152"), (stryMutAct_9fa48("5154") ? closureRequest.sourceType !== "SERVICE" : stryMutAct_9fa48("5153") ? true : (stryCov_9fa48("5153", "5154"), closureRequest.sourceType === (stryMutAct_9fa48("5155") ? "" : (stryCov_9fa48("5155"), "SERVICE")))) && (stryMutAct_9fa48("5157") ? closureRequest.sourceId !== serviceId : stryMutAct_9fa48("5156") ? true : (stryCov_9fa48("5156", "5157"), closureRequest.sourceId === serviceId)))))));
        if (stryMutAct_9fa48("5160") ? closureDependency.outcome !== "blocked" : stryMutAct_9fa48("5159") ? false : stryMutAct_9fa48("5158") ? true : (stryCov_9fa48("5158", "5159", "5160"), closureDependency.outcome === (stryMutAct_9fa48("5161") ? "" : (stryCov_9fa48("5161"), "blocked")))) {
          if (stryMutAct_9fa48("5162")) {
            {}
          } else {
            stryCov_9fa48("5162");
            return errorResponse(409, stryMutAct_9fa48("5163") ? "" : (stryCov_9fa48("5163"), "No se puede iniciar el Servicio: la solicitud de corte de calle sigue pendiente de respuesta de Tránsito."), path);
          }
        }
        if (stryMutAct_9fa48("5166") ? closureDependency.outcome !== "rejected" : stryMutAct_9fa48("5165") ? false : stryMutAct_9fa48("5164") ? true : (stryCov_9fa48("5164", "5165", "5166"), closureDependency.outcome === (stryMutAct_9fa48("5167") ? "" : (stryCov_9fa48("5167"), "rejected")))) {
          if (stryMutAct_9fa48("5168")) {
            {}
          } else {
            stryCov_9fa48("5168");
            return errorResponse(409, stryMutAct_9fa48("5169") ? "" : (stryCov_9fa48("5169"), "Tránsito rechazó el corte de calle. Oficina debe elegir explícitamente entre reprogramar o cancelar el Servicio."), path);
          }
        }

        // Backend state machine rules:
        if (stryMutAct_9fa48("5172") ? service.status === "SCHEDULED" : stryMutAct_9fa48("5171") ? false : stryMutAct_9fa48("5170") ? true : (stryCov_9fa48("5170", "5171", "5172"), service.status !== (stryMutAct_9fa48("5173") ? "" : (stryCov_9fa48("5173"), "SCHEDULED")))) {
          if (stryMutAct_9fa48("5174")) {
            {}
          } else {
            stryCov_9fa48("5174");
            return errorResponse(409, stryMutAct_9fa48("5175") ? `` : (stryCov_9fa48("5175"), `Solo se pueden iniciar servicios en estado SCHEDULED (estado actual: ${service.status}).`), path);
          }
        }
        if (stryMutAct_9fa48("5178") ? false : stryMutAct_9fa48("5177") ? true : stryMutAct_9fa48("5176") ? service.crewId : (stryCov_9fa48("5176", "5177", "5178"), !service.crewId)) {
          if (stryMutAct_9fa48("5179")) {
            {}
          } else {
            stryCov_9fa48("5179");
            return errorResponse(409, stryMutAct_9fa48("5180") ? "" : (stryCov_9fa48("5180"), "No se puede iniciar el servicio sin una cuadrilla asignada."), path);
          }
        }
        const serviceType = SERVICE_TYPE_CATALOG.find(stryMutAct_9fa48("5181") ? () => undefined : (stryCov_9fa48("5181"), t => stryMutAct_9fa48("5184") ? t.id !== service.serviceTypeId : stryMutAct_9fa48("5183") ? false : stryMutAct_9fa48("5182") ? true : (stryCov_9fa48("5182", "5183", "5184"), t.id === service.serviceTypeId)));
        if (stryMutAct_9fa48("5187") ? serviceType?.requiresVehicle || !service.vehicleId || !service.vehicleId.trim() : stryMutAct_9fa48("5186") ? false : stryMutAct_9fa48("5185") ? true : (stryCov_9fa48("5185", "5186", "5187"), (stryMutAct_9fa48("5188") ? serviceType.requiresVehicle : (stryCov_9fa48("5188"), serviceType?.requiresVehicle)) && (stryMutAct_9fa48("5190") ? !service.vehicleId && !service.vehicleId.trim() : stryMutAct_9fa48("5189") ? true : (stryCov_9fa48("5189", "5190"), (stryMutAct_9fa48("5191") ? service.vehicleId : (stryCov_9fa48("5191"), !service.vehicleId)) || (stryMutAct_9fa48("5192") ? service.vehicleId.trim() : (stryCov_9fa48("5192"), !(stryMutAct_9fa48("5193") ? service.vehicleId : (stryCov_9fa48("5193"), service.vehicleId.trim())))))))) {
          if (stryMutAct_9fa48("5194")) {
            {}
          } else {
            stryCov_9fa48("5194");
            return errorResponse(409, stryMutAct_9fa48("5195") ? "" : (stryCov_9fa48("5195"), "El tipo de servicio requiere un vehículo operativo asignado para iniciar."), path);
          }
        }
        if (stryMutAct_9fa48("5198") ? scenario.actor.kind === "FIELD" && scenario.actor.crewId || service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("5197") ? false : stryMutAct_9fa48("5196") ? true : (stryCov_9fa48("5196", "5197", "5198"), (stryMutAct_9fa48("5200") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5199") ? true : (stryCov_9fa48("5199", "5200"), (stryMutAct_9fa48("5202") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5201") ? true : (stryCov_9fa48("5201", "5202"), scenario.actor.kind === (stryMutAct_9fa48("5203") ? "" : (stryCov_9fa48("5203"), "FIELD")))) && scenario.actor.crewId)) && (stryMutAct_9fa48("5205") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5204") ? true : (stryCov_9fa48("5204", "5205"), service.crewId !== scenario.actor.crewId)))) {
          if (stryMutAct_9fa48("5206")) {
            {}
          } else {
            stryCov_9fa48("5206");
            return errorResponse(403, stryMutAct_9fa48("5207") ? "" : (stryCov_9fa48("5207"), "Solo la cuadrilla asignada al servicio puede registrar su inicio."), path);
          }
        }
        const historyEntry = serviceHistoryEntry(stryMutAct_9fa48("5208") ? "" : (stryCov_9fa48("5208"), "En curso"));
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("5209") ? {} : (stryCov_9fa48("5209"), {
          status: stryMutAct_9fa48("5210") ? "" : (stryCov_9fa48("5210"), "IN_PROGRESS"),
          history: stryMutAct_9fa48("5211") ? [] : (stryCov_9fa48("5211"), [...service.history, historyEntry])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("5212") ? {} : (stryCov_9fa48("5212"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5213")) {
        {}
      } else {
        stryCov_9fa48("5213");
        return handleRouteError(error, path, stryMutAct_9fa48("5214") ? "" : (stryCov_9fa48("5214"), "No se pudo iniciar el servicio."));
      }
    }
  }
}