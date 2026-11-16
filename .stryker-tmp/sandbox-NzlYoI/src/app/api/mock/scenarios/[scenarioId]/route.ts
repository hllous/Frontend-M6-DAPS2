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
import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { loadAuthorizedScenario } from "@/lib/bff-data";
import { sealRolesIfChanged } from "@/lib/me";
import { AuthUnavailableError, BackendUnavailableError, CitizenForbiddenError, ForbiddenSessionError, InvalidSessionError } from "@/lib/session";
import { isScenarioId } from "@/lib/scenarios";
import { recordTelemetryEvent } from "@/lib/telemetry";
export async function GET(request: Request, context: {
  params: Promise<{
    scenarioId: string;
  }>;
}) {
  if (stryMutAct_9fa48("3127")) {
    {}
  } else {
    stryCov_9fa48("3127");
    const {
      scenarioId
    } = await context.params;
    const path = new URL(request.url).pathname;
    if (stryMutAct_9fa48("3130") ? false : stryMutAct_9fa48("3129") ? true : stryMutAct_9fa48("3128") ? isScenarioId(scenarioId) : (stryCov_9fa48("3128", "3129", "3130"), !isScenarioId(scenarioId))) {
      if (stryMutAct_9fa48("3131")) {
        {}
      } else {
        stryCov_9fa48("3131");
        return NextResponse.json(stryMutAct_9fa48("3132") ? {} : (stryCov_9fa48("3132"), {
          message: stryMutAct_9fa48("3133") ? "" : (stryCov_9fa48("3133"), "Escenario no encontrado.")
        }), stryMutAct_9fa48("3134") ? {} : (stryCov_9fa48("3134"), {
          status: 404
        }));
      }
    }
    try {
      if (stryMutAct_9fa48("3135")) {
        {}
      } else {
        stryCov_9fa48("3135");
        const {
          roles,
          scenario
        } = await loadAuthorizedScenario(request, scenarioId);
        const response = NextResponse.json(scenario);
        if (stryMutAct_9fa48("3136")) {
          ;
        } else {
          stryCov_9fa48("3136");
          sealRolesIfChanged(response, request, roles);
        }
        return response;
      }
    } catch (error) {
      if (stryMutAct_9fa48("3137")) {
        {}
      } else {
        stryCov_9fa48("3137");
        if (stryMutAct_9fa48("3139") ? false : stryMutAct_9fa48("3138") ? true : (stryCov_9fa48("3138", "3139"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("3140")) {
            {}
          } else {
            stryCov_9fa48("3140");
            recordTelemetryEvent(stryMutAct_9fa48("3142") ? {} : (stryCov_9fa48("3142"), {
              name: stryMutAct_9fa48("3143") ? "" : (stryCov_9fa48("3143"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("3144") ? "" : (stryCov_9fa48("3144"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("3146") ? false : stryMutAct_9fa48("3145") ? true : (stryCov_9fa48("3145", "3146"), error instanceof CitizenForbiddenError)) {
          if (stryMutAct_9fa48("3147")) {
            {}
          } else {
            stryCov_9fa48("3147");
            recordTelemetryEvent(stryMutAct_9fa48("3149") ? {} : (stryCov_9fa48("3149"), {
              name: stryMutAct_9fa48("3150") ? "" : (stryCov_9fa48("3150"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path);
          }
        }
        if (stryMutAct_9fa48("3152") ? false : stryMutAct_9fa48("3151") ? true : (stryCov_9fa48("3151", "3152"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("3153")) {
            {}
          } else {
            stryCov_9fa48("3153");
            recordTelemetryEvent(stryMutAct_9fa48("3155") ? {} : (stryCov_9fa48("3155"), {
              name: stryMutAct_9fa48("3156") ? "" : (stryCov_9fa48("3156"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, stryMutAct_9fa48("3157") ? "" : (stryCov_9fa48("3157"), "La sesión no puede consultar este escenario."), path);
          }
        }
        if (stryMutAct_9fa48("3159") ? false : stryMutAct_9fa48("3158") ? true : (stryCov_9fa48("3158", "3159"), error instanceof BackendUnavailableError)) {
          if (stryMutAct_9fa48("3160")) {
            {}
          } else {
            stryCov_9fa48("3160");
            return errorResponse(error.status, error.message, path);
          }
        }
        if (stryMutAct_9fa48("3162") ? false : stryMutAct_9fa48("3161") ? true : (stryCov_9fa48("3161", "3162"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("3163")) {
            {}
          } else {
            stryCov_9fa48("3163");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("3164") ? "" : (stryCov_9fa48("3164"), "No se pudo cargar el escenario."));
      }
    }
  }
}