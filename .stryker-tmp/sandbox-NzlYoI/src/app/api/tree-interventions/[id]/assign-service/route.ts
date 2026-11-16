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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeInterventionFixture, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { treeInterventionAssignServiceInputSchema, type TreeInterventionAssignServiceInput } from "@/lib/tree-interventions";
import { serviceFixtures } from "@/lib/services-fixtures";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
async function backendAssignService(request: Request, id: string, input: TreeInterventionAssignServiceInput) {
  if (stryMutAct_9fa48("5890")) {
    {}
  } else {
    stryCov_9fa48("5890");
    const response = await fetchBackend(request, stryMutAct_9fa48("5891") ? `` : (stryCov_9fa48("5891"), `/tree-interventions/${pathId(id)}/assign-service`), stryMutAct_9fa48("5892") ? "" : (stryCov_9fa48("5892"), "service:schedule"), stryMutAct_9fa48("5893") ? {} : (stryCov_9fa48("5893"), {
      method: stryMutAct_9fa48("5894") ? "" : (stryCov_9fa48("5894"), "POST"),
      headers: stryMutAct_9fa48("5895") ? {} : (stryCov_9fa48("5895"), {
        "content-type": stryMutAct_9fa48("5896") ? "" : (stryCov_9fa48("5896"), "application/json")
      }),
      body: JSON.stringify(input)
    }));
    return forwardResponse(response);
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5897")) {
    {}
  } else {
    stryCov_9fa48("5897");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5898")) {
        {}
      } else {
        stryCov_9fa48("5898");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("5900") ? {} : (stryCov_9fa48("5900"), {
          office: stryMutAct_9fa48("5901") ? false : (stryCov_9fa48("5901"), true),
          officeMessage: stryMutAct_9fa48("5902") ? "" : (stryCov_9fa48("5902"), "Solo Oficina puede programar y asociar un servicio."),
          capability: stryMutAct_9fa48("5903") ? "" : (stryCov_9fa48("5903"), "service:schedule"),
          capabilityMessage: stryMutAct_9fa48("5904") ? "" : (stryCov_9fa48("5904"), "La sesión no tiene capacidad para programar servicios."),
          throwOnError: stryMutAct_9fa48("5905") ? false : (stryCov_9fa48("5905"), true)
        }));
        const parsed = await parseJsonBody(request, treeInterventionAssignServiceInputSchema, path);
        if (stryMutAct_9fa48("5907") ? false : stryMutAct_9fa48("5906") ? true : (stryCov_9fa48("5906", "5907"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("5909") ? false : stryMutAct_9fa48("5908") ? true : (stryCov_9fa48("5908", "5909"), backendMode(session))) {
          if (stryMutAct_9fa48("5910")) {
            {}
          } else {
            stryCov_9fa48("5910");
            return backendAssignService(request, id, parsed.data);
          }
        }
        const intervention = getTreeInterventionFixture(id);
        if (stryMutAct_9fa48("5913") ? false : stryMutAct_9fa48("5912") ? true : stryMutAct_9fa48("5911") ? intervention : (stryCov_9fa48("5911", "5912", "5913"), !intervention)) return errorResponse(404, stryMutAct_9fa48("5914") ? `` : (stryCov_9fa48("5914"), `Intervención de arbolado ${id} no encontrada.`), path);
        if (stryMutAct_9fa48("5917") ? intervention.status === "AUTHORIZED" : stryMutAct_9fa48("5916") ? false : stryMutAct_9fa48("5915") ? true : (stryCov_9fa48("5915", "5916", "5917"), intervention.status !== (stryMutAct_9fa48("5918") ? "" : (stryCov_9fa48("5918"), "AUTHORIZED")))) {
          if (stryMutAct_9fa48("5919")) {
            {}
          } else {
            stryCov_9fa48("5919");
            return errorResponse(409, stryMutAct_9fa48("5920") ? "" : (stryCov_9fa48("5920"), "Solo se puede asociar un servicio a una intervención autorizada."), path);
          }
        }
        if (stryMutAct_9fa48("5922") ? false : stryMutAct_9fa48("5921") ? true : (stryCov_9fa48("5921", "5922"), intervention.serviceId)) {
          if (stryMutAct_9fa48("5923")) {
            {}
          } else {
            stryCov_9fa48("5923");
            return errorResponse(409, stryMutAct_9fa48("5924") ? "" : (stryCov_9fa48("5924"), "La intervención ya tiene un servicio asociado."), path);
          }
        }
        const service = serviceFixtures.find(stryMutAct_9fa48("5925") ? () => undefined : (stryCov_9fa48("5925"), candidate => stryMutAct_9fa48("5928") ? candidate.id !== parsed.data.serviceId : stryMutAct_9fa48("5927") ? false : stryMutAct_9fa48("5926") ? true : (stryCov_9fa48("5926", "5927", "5928"), candidate.id === parsed.data.serviceId)));
        if (stryMutAct_9fa48("5931") ? false : stryMutAct_9fa48("5930") ? true : stryMutAct_9fa48("5929") ? service : (stryCov_9fa48("5929", "5930", "5931"), !service)) return errorResponse(404, stryMutAct_9fa48("5932") ? `` : (stryCov_9fa48("5932"), `Servicio ${parsed.data.serviceId} no encontrado.`), path);
        if (stryMutAct_9fa48("5935") ? service.mode === "POINT" : stryMutAct_9fa48("5934") ? false : stryMutAct_9fa48("5933") ? true : (stryCov_9fa48("5933", "5934", "5935"), service.mode !== (stryMutAct_9fa48("5936") ? "" : (stryCov_9fa48("5936"), "POINT")))) {
          if (stryMutAct_9fa48("5937")) {
            {}
          } else {
            stryCov_9fa48("5937");
            return errorResponse(400, stryMutAct_9fa48("5938") ? "" : (stryCov_9fa48("5938"), "El servicio de una intervención de arbolado debe ser de modo POINT."), path);
          }
        }
        return NextResponse.json(updateTreeInterventionFixture(id, stryMutAct_9fa48("5939") ? {} : (stryCov_9fa48("5939"), {
          serviceId: service.id
        })), stryMutAct_9fa48("5940") ? {} : (stryCov_9fa48("5940"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5941")) {
        {}
      } else {
        stryCov_9fa48("5941");
        if (stryMutAct_9fa48("5943") ? false : stryMutAct_9fa48("5942") ? true : (stryCov_9fa48("5942", "5943"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5944") ? "" : (stryCov_9fa48("5944"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5946") ? false : stryMutAct_9fa48("5945") ? true : (stryCov_9fa48("5945", "5946"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("5948") ? false : stryMutAct_9fa48("5947") ? true : (stryCov_9fa48("5947", "5948"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5949") ? "" : (stryCov_9fa48("5949"), "No se pudo asociar el servicio a la intervención."));
      }
    }
  }
}