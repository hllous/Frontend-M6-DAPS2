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
  if (stryMutAct_9fa48("3686")) {
    {}
  } else {
    stryCov_9fa48("3686");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3687")) {
        {}
      } else {
        stryCov_9fa48("3687");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("3690") ? false : stryMutAct_9fa48("3689") ? true : stryMutAct_9fa48("3688") ? scenario.capabilities.includes("referral:reconcile") : (stryCov_9fa48("3688", "3689", "3690"), !scenario.capabilities.includes(stryMutAct_9fa48("3691") ? "" : (stryCov_9fa48("3691"), "referral:reconcile")))) return errorResponse(403, stryMutAct_9fa48("3692") ? "" : (stryCov_9fa48("3692"), "Su rol no permite reconciliar derivaciones."), path, FORBIDDEN_CODES.roleRequired);
        let body: unknown = {};
        try {
          if (stryMutAct_9fa48("3693")) {
            {}
          } else {
            stryCov_9fa48("3693");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("3694")) {
            {}
          } else {
            stryCov_9fa48("3694");
            return errorResponse(400, stryMutAct_9fa48("3695") ? "" : (stryCov_9fa48("3695"), "El cuerpo de la solicitud no es un JSON válido."), path);
          }
        }
        const parsed = repairRequestRecoveryInputSchema.safeParse(body);
        if (stryMutAct_9fa48("3698") ? false : stryMutAct_9fa48("3697") ? true : stryMutAct_9fa48("3696") ? parsed.success : (stryCov_9fa48("3696", "3697", "3698"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("3699") ? () => undefined : (stryCov_9fa48("3699"), issue => issue.message)).join(stryMutAct_9fa48("3700") ? "" : (stryCov_9fa48("3700"), " ")), path);
        if (stryMutAct_9fa48("3702") ? false : stryMutAct_9fa48("3701") ? true : (stryCov_9fa48("3701", "3702"), backendMode(session))) {
          if (stryMutAct_9fa48("3703")) {
            {}
          } else {
            stryCov_9fa48("3703");
            const response = await fetchBackend(request, stryMutAct_9fa48("3704") ? `` : (stryCov_9fa48("3704"), `/repair-requests/${pathId(id)}/close`), undefined, stryMutAct_9fa48("3705") ? {} : (stryCov_9fa48("3705"), {
              method: stryMutAct_9fa48("3706") ? "" : (stryCov_9fa48("3706"), "POST"),
              headers: stryMutAct_9fa48("3707") ? {} : (stryCov_9fa48("3707"), {
                "content-type": stryMutAct_9fa48("3708") ? "" : (stryCov_9fa48("3708"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const current = getRepairRequestFixture(id);
        if (stryMutAct_9fa48("3711") ? false : stryMutAct_9fa48("3710") ? true : stryMutAct_9fa48("3709") ? current : (stryCov_9fa48("3709", "3710", "3711"), !current)) return errorResponse(404, stryMutAct_9fa48("3712") ? `` : (stryCov_9fa48("3712"), `Derivación ${id} no encontrada.`), path);
        if (stryMutAct_9fa48("3715") ? current.status === "IN_PROGRESS" : stryMutAct_9fa48("3714") ? false : stryMutAct_9fa48("3713") ? true : (stryCov_9fa48("3713", "3714", "3715"), current.status !== (stryMutAct_9fa48("3716") ? "" : (stryCov_9fa48("3716"), "IN_PROGRESS")))) return errorResponse(409, stryMutAct_9fa48("3717") ? `` : (stryCov_9fa48("3717"), `Solo se puede cerrar una derivación IN_PROGRESS (estado actual: ${current.status}).`), path);
        return NextResponse.json(transitionRepairRequestFixture(id, stryMutAct_9fa48("3718") ? "" : (stryCov_9fa48("3718"), "CLOSED"), parsed.data));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3719")) {
        {}
      } else {
        stryCov_9fa48("3719");
        if (stryMutAct_9fa48("3721") ? false : stryMutAct_9fa48("3720") ? true : (stryCov_9fa48("3720", "3721"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3722") ? "" : (stryCov_9fa48("3722"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3724") ? false : stryMutAct_9fa48("3723") ? true : (stryCov_9fa48("3723", "3724"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3725") ? "" : (stryCov_9fa48("3725"), "No se pudo cerrar la derivación."));
      }
    }
  }
}