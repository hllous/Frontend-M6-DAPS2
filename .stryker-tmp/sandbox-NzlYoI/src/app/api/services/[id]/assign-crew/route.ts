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
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { assignCrewFixture } from "@/lib/services-fixtures";
import { assignCrewInputSchema } from "@/lib/services";
import { getRequiredSession } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4740")) {
    {}
  } else {
    stryCov_9fa48("4740");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4741")) {
        {}
      } else {
        stryCov_9fa48("4741");
        const session = getRequiredSession(request);

        // Permission check: crew/vehicle assignment is an Office decision, not a Field action.
        authorize(session, stryMutAct_9fa48("4743") ? {} : (stryCov_9fa48("4743"), {
          office: stryMutAct_9fa48("4744") ? false : (stryCov_9fa48("4744"), true),
          officeMessage: stryMutAct_9fa48("4745") ? "" : (stryCov_9fa48("4745"), "Solo Oficina puede asignar cuadrilla y vehículo a un servicio."),
          capability: stryMutAct_9fa48("4746") ? "" : (stryCov_9fa48("4746"), "service:assign"),
          throwOnError: stryMutAct_9fa48("4747") ? false : (stryCov_9fa48("4747"), true)
        }));
        let body: unknown;
        try {
          if (stryMutAct_9fa48("4748")) {
            {}
          } else {
            stryCov_9fa48("4748");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("4749")) {
            {}
          } else {
            stryCov_9fa48("4749");
            return errorResponse(400, stryMutAct_9fa48("4750") ? "" : (stryCov_9fa48("4750"), "El cuerpo de la solicitud no es un JSON válido."), path);
          }
        }
        const parsed = assignCrewInputSchema.safeParse(body);
        if (stryMutAct_9fa48("4753") ? false : stryMutAct_9fa48("4752") ? true : stryMutAct_9fa48("4751") ? parsed.success : (stryCov_9fa48("4751", "4752", "4753"), !parsed.success)) {
          if (stryMutAct_9fa48("4754")) {
            {}
          } else {
            stryCov_9fa48("4754");
            const message = parsed.error.issues.map(stryMutAct_9fa48("4755") ? () => undefined : (stryCov_9fa48("4755"), issue => issue.message)).join(stryMutAct_9fa48("4756") ? "" : (stryCov_9fa48("4756"), " "));
            return errorResponse(400, message, path);
          }
        }
        const input = parsed.data;
        if (stryMutAct_9fa48("4758") ? false : stryMutAct_9fa48("4757") ? true : (stryCov_9fa48("4757", "4758"), backendMode(session))) {
          if (stryMutAct_9fa48("4759")) {
            {}
          } else {
            stryCov_9fa48("4759");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4760") ? `` : (stryCov_9fa48("4760"), `/services/${pathId(serviceId)}/assign-crew`), undefined, stryMutAct_9fa48("4761") ? {} : (stryCov_9fa48("4761"), {
              method: stryMutAct_9fa48("4762") ? "" : (stryCov_9fa48("4762"), "POST"),
              headers: stryMutAct_9fa48("4763") ? {} : (stryCov_9fa48("4763"), {
                "content-type": stryMutAct_9fa48("4764") ? "" : (stryCov_9fa48("4764"), "application/json")
              }),
              body: JSON.stringify(input)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const result = assignCrewFixture(serviceId, input);
        if (stryMutAct_9fa48("4766") ? false : stryMutAct_9fa48("4765") ? true : (stryCov_9fa48("4765", "4766"), (stryMutAct_9fa48("4767") ? "" : (stryCov_9fa48("4767"), "status")) in result)) return errorResponse(result.status, result.message, path);
        return NextResponse.json(result.service, stryMutAct_9fa48("4768") ? {} : (stryCov_9fa48("4768"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4769")) {
        {}
      } else {
        stryCov_9fa48("4769");
        return handleRouteError(error, path, stryMutAct_9fa48("4770") ? "" : (stryCov_9fa48("4770"), "No se pudo asignar la cuadrilla al servicio."));
      }
    }
  }
}