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
import { backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getRepairRequestFixture, transitionRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { repairRequestRecoveryInputSchema } from "@/lib/repair-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("3777")) {
    {}
  } else {
    stryCov_9fa48("3777");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3778")) {
        {}
      } else {
        stryCov_9fa48("3778");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("3781") ? false : stryMutAct_9fa48("3780") ? true : stryMutAct_9fa48("3779") ? scenario.capabilities.includes("referral:reconcile") : (stryCov_9fa48("3779", "3780", "3781"), !scenario.capabilities.includes(stryMutAct_9fa48("3782") ? "" : (stryCov_9fa48("3782"), "referral:reconcile")))) return errorResponse(403, stryMutAct_9fa48("3783") ? "" : (stryCov_9fa48("3783"), "Su rol no permite reconciliar derivaciones."), path, FORBIDDEN_CODES.roleRequired);
        let body: unknown = {};
        try {
          if (stryMutAct_9fa48("3784")) {
            {}
          } else {
            stryCov_9fa48("3784");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("3785")) {
            {}
          } else {
            stryCov_9fa48("3785");
            return errorResponse(400, stryMutAct_9fa48("3786") ? "" : (stryCov_9fa48("3786"), "El cuerpo de la solicitud no es un JSON válido."), path);
          }
        }
        const parsed = repairRequestRecoveryInputSchema.safeParse(body);
        if (stryMutAct_9fa48("3789") ? false : stryMutAct_9fa48("3788") ? true : stryMutAct_9fa48("3787") ? parsed.success : (stryCov_9fa48("3787", "3788", "3789"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("3790") ? () => undefined : (stryCov_9fa48("3790"), issue => issue.message)).join(stryMutAct_9fa48("3791") ? "" : (stryCov_9fa48("3791"), " ")), path);
        if (stryMutAct_9fa48("3793") ? false : stryMutAct_9fa48("3792") ? true : (stryCov_9fa48("3792", "3793"), backendMode(session))) {
          if (stryMutAct_9fa48("3794")) {
            {}
          } else {
            stryCov_9fa48("3794");
            const response = await fetchBackend(request, stryMutAct_9fa48("3795") ? `` : (stryCov_9fa48("3795"), `/repair-requests/${pathId(id)}/start`), undefined, stryMutAct_9fa48("3796") ? {} : (stryCov_9fa48("3796"), {
              method: stryMutAct_9fa48("3797") ? "" : (stryCov_9fa48("3797"), "POST"),
              headers: stryMutAct_9fa48("3798") ? {} : (stryCov_9fa48("3798"), {
                "content-type": stryMutAct_9fa48("3799") ? "" : (stryCov_9fa48("3799"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const current = getRepairRequestFixture(id);
        if (stryMutAct_9fa48("3802") ? false : stryMutAct_9fa48("3801") ? true : stryMutAct_9fa48("3800") ? current : (stryCov_9fa48("3800", "3801", "3802"), !current)) return errorResponse(404, stryMutAct_9fa48("3803") ? `` : (stryCov_9fa48("3803"), `Derivación ${id} no encontrada.`), path);
        if (stryMutAct_9fa48("3806") ? current.status === "REQUESTED" : stryMutAct_9fa48("3805") ? false : stryMutAct_9fa48("3804") ? true : (stryCov_9fa48("3804", "3805", "3806"), current.status !== (stryMutAct_9fa48("3807") ? "" : (stryCov_9fa48("3807"), "REQUESTED")))) return errorResponse(409, stryMutAct_9fa48("3808") ? `` : (stryCov_9fa48("3808"), `Solo se puede iniciar una derivación REQUESTED (estado actual: ${current.status}).`), path);
        return NextResponse.json(transitionRepairRequestFixture(id, stryMutAct_9fa48("3809") ? "" : (stryCov_9fa48("3809"), "IN_PROGRESS"), parsed.data));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3810")) {
        {}
      } else {
        stryCov_9fa48("3810");
        if (stryMutAct_9fa48("3812") ? false : stryMutAct_9fa48("3811") ? true : (stryCov_9fa48("3811", "3812"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3813") ? "" : (stryCov_9fa48("3813"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3815") ? false : stryMutAct_9fa48("3814") ? true : (stryCov_9fa48("3814", "3815"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3816") ? "" : (stryCov_9fa48("3816"), "No se pudo iniciar la derivación."));
      }
    }
  }
}