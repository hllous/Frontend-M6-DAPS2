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
import { completeRepairFixture, getContainerFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("211")) {
    {}
  } else {
    stryCov_9fa48("211");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("212")) {
    {}
  } else {
    stryCov_9fa48("212");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("213")) {
        {}
      } else {
        stryCov_9fa48("213");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("215") ? {} : (stryCov_9fa48("215"), {
          office: stryMutAct_9fa48("216") ? false : (stryCov_9fa48("216"), true),
          officeMessage: stryMutAct_9fa48("217") ? "" : (stryCov_9fa48("217"), "No tiene permisos para completar reparaciones de contenedores."),
          capability: stryMutAct_9fa48("218") ? "" : (stryCov_9fa48("218"), "container:manage"),
          capabilityMessage: stryMutAct_9fa48("219") ? "" : (stryCov_9fa48("219"), "No tiene permisos para completar reparaciones de contenedores."),
          throwOnError: stryMutAct_9fa48("220") ? false : (stryCov_9fa48("220"), true)
        }));
        if (stryMutAct_9fa48("222") ? false : stryMutAct_9fa48("221") ? true : (stryCov_9fa48("221", "222"), backendMode(session))) {
          if (stryMutAct_9fa48("223")) {
            {}
          } else {
            stryCov_9fa48("223");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("224") ? `` : (stryCov_9fa48("224"), `/containers/${pathId(id)}/complete-repair`), stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), "container:manage"), stryMutAct_9fa48("226") ? {} : (stryCov_9fa48("226"), {
              method: stryMutAct_9fa48("227") ? "" : (stryCov_9fa48("227"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("230") ? false : stryMutAct_9fa48("229") ? true : stryMutAct_9fa48("228") ? container : (stryCov_9fa48("228", "229", "230"), !container)) return errorResponse(404, stryMutAct_9fa48("231") ? `` : (stryCov_9fa48("231"), `Contenedor ${id} no encontrado.`), path);
        if (stryMutAct_9fa48("234") ? container.status === "UNDER_REPAIR" : stryMutAct_9fa48("233") ? false : stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232", "233", "234"), container.status !== (stryMutAct_9fa48("235") ? "" : (stryCov_9fa48("235"), "UNDER_REPAIR")))) {
          if (stryMutAct_9fa48("236")) {
            {}
          } else {
            stryCov_9fa48("236");
            return errorResponse(409, stryMutAct_9fa48("237") ? `` : (stryCov_9fa48("237"), `Solo se puede completar la reparación de contenedores en reparación. Estado actual: ${container.status}`), path);
          }
        }
        return NextResponse.json(completeRepairFixture(id), stryMutAct_9fa48("238") ? {} : (stryCov_9fa48("238"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("239")) {
        {}
      } else {
        stryCov_9fa48("239");
        return handleRouteError(error, path, stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "No se pudo completar la reparación del contenedor."));
      }
    }
  }
}