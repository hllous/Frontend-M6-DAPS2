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
import { backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("3726")) {
    {}
  } else {
    stryCov_9fa48("3726");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3727")) {
        {}
      } else {
        stryCov_9fa48("3727");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        const item = getRepairRequestFixture(id);
        if (stryMutAct_9fa48("3730") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3729") ? false : stryMutAct_9fa48("3728") ? true : (stryCov_9fa48("3728", "3729", "3730"), scenario.actor.kind === (stryMutAct_9fa48("3731") ? "" : (stryCov_9fa48("3731"), "FIELD")))) {
          if (stryMutAct_9fa48("3732")) {
            {}
          } else {
            stryCov_9fa48("3732");
            const sourceService = (stryMutAct_9fa48("3735") ? item?.detectedInType !== "SERVICE" : stryMutAct_9fa48("3734") ? false : stryMutAct_9fa48("3733") ? true : (stryCov_9fa48("3733", "3734", "3735"), (stryMutAct_9fa48("3736") ? item.detectedInType : (stryCov_9fa48("3736"), item?.detectedInType)) === (stryMutAct_9fa48("3737") ? "" : (stryCov_9fa48("3737"), "SERVICE")))) ? serviceFixtures.find(stryMutAct_9fa48("3738") ? () => undefined : (stryCov_9fa48("3738"), service => stryMutAct_9fa48("3741") ? service.id !== item.detectedInId : stryMutAct_9fa48("3740") ? false : stryMutAct_9fa48("3739") ? true : (stryCov_9fa48("3739", "3740", "3741"), service.id === item.detectedInId))) : (stryMutAct_9fa48("3744") ? item?.detectedInType !== "INSPECTION" : stryMutAct_9fa48("3743") ? false : stryMutAct_9fa48("3742") ? true : (stryCov_9fa48("3742", "3743", "3744"), (stryMutAct_9fa48("3745") ? item.detectedInType : (stryCov_9fa48("3745"), item?.detectedInType)) === (stryMutAct_9fa48("3746") ? "" : (stryCov_9fa48("3746"), "INSPECTION")))) ? (() => {
              if (stryMutAct_9fa48("3747")) {
                {}
              } else {
                stryCov_9fa48("3747");
                const inspection = getEnvironmentalInspectionFixture(item.detectedInId);
                return (stryMutAct_9fa48("3748") ? inspection.serviceId : (stryCov_9fa48("3748"), inspection?.serviceId)) ? serviceFixtures.find(stryMutAct_9fa48("3749") ? () => undefined : (stryCov_9fa48("3749"), service => stryMutAct_9fa48("3752") ? service.id !== inspection.serviceId : stryMutAct_9fa48("3751") ? false : stryMutAct_9fa48("3750") ? true : (stryCov_9fa48("3750", "3751", "3752"), service.id === inspection.serviceId))) : undefined;
              }
            })() : undefined;
            if (stryMutAct_9fa48("3755") ? (!scenario.actor.crewId || !sourceService) && sourceService.crewId !== scenario.actor.crewId : stryMutAct_9fa48("3754") ? false : stryMutAct_9fa48("3753") ? true : (stryCov_9fa48("3753", "3754", "3755"), (stryMutAct_9fa48("3757") ? !scenario.actor.crewId && !sourceService : stryMutAct_9fa48("3756") ? false : (stryCov_9fa48("3756", "3757"), (stryMutAct_9fa48("3758") ? scenario.actor.crewId : (stryCov_9fa48("3758"), !scenario.actor.crewId)) || (stryMutAct_9fa48("3759") ? sourceService : (stryCov_9fa48("3759"), !sourceService)))) || (stryMutAct_9fa48("3761") ? sourceService.crewId === scenario.actor.crewId : stryMutAct_9fa48("3760") ? false : (stryCov_9fa48("3760", "3761"), sourceService.crewId !== scenario.actor.crewId)))) {
              if (stryMutAct_9fa48("3762")) {
                {}
              } else {
                stryCov_9fa48("3762");
                return errorResponse(403, stryMutAct_9fa48("3763") ? "" : (stryCov_9fa48("3763"), "Solo puede consultar derivaciones de su cuadrilla."), path);
              }
            }
          }
        } else if (stryMutAct_9fa48("3766") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("3765") ? false : stryMutAct_9fa48("3764") ? true : (stryCov_9fa48("3764", "3765", "3766"), scenario.actor.kind !== (stryMutAct_9fa48("3767") ? "" : (stryCov_9fa48("3767"), "OFFICE")))) {
          if (stryMutAct_9fa48("3768")) {
            {}
          } else {
            stryCov_9fa48("3768");
            return errorResponse(403, stryMutAct_9fa48("3769") ? "" : (stryCov_9fa48("3769"), "Solo Oficina o Campo puede consultar derivaciones."), path);
          }
        }
        if (stryMutAct_9fa48("3771") ? false : stryMutAct_9fa48("3770") ? true : (stryCov_9fa48("3770", "3771"), backendMode(session))) {
          if (stryMutAct_9fa48("3772")) {
            {}
          } else {
            stryCov_9fa48("3772");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3773") ? `` : (stryCov_9fa48("3773"), `/repair-requests/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        return item ? NextResponse.json(item) : errorResponse(404, stryMutAct_9fa48("3774") ? `` : (stryCov_9fa48("3774"), `Derivación ${id} no encontrada.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("3775")) {
        {}
      } else {
        stryCov_9fa48("3775");
        return handleRouteError(error, path, stryMutAct_9fa48("3776") ? "" : (stryCov_9fa48("3776"), "No se pudo cargar la derivación."));
      }
    }
  }
}