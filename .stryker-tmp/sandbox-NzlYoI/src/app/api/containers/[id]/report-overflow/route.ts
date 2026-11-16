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
import { getContainerFixture, reportOverflowFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("402")) {
    {}
  } else {
    stryCov_9fa48("402");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("403")) {
    {}
  } else {
    stryCov_9fa48("403");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("404")) {
        {}
      } else {
        stryCov_9fa48("404");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("406") ? {} : (stryCov_9fa48("406"), {
          capability: stryMutAct_9fa48("407") ? "" : (stryCov_9fa48("407"), "container:report"),
          capabilityMessage: stryMutAct_9fa48("408") ? "" : (stryCov_9fa48("408"), "No tiene permisos para reportar desbordes de contenedores."),
          throwOnError: stryMutAct_9fa48("409") ? false : (stryCov_9fa48("409"), true)
        }));
        if (stryMutAct_9fa48("411") ? false : stryMutAct_9fa48("410") ? true : (stryCov_9fa48("410", "411"), backendMode(session))) {
          if (stryMutAct_9fa48("412")) {
            {}
          } else {
            stryCov_9fa48("412");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("413") ? `` : (stryCov_9fa48("413"), `/containers/${pathId(id)}/report-overflow`), stryMutAct_9fa48("414") ? "" : (stryCov_9fa48("414"), "container:report"), stryMutAct_9fa48("415") ? {} : (stryCov_9fa48("415"), {
              method: stryMutAct_9fa48("416") ? "" : (stryCov_9fa48("416"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("419") ? false : stryMutAct_9fa48("418") ? true : stryMutAct_9fa48("417") ? container : (stryCov_9fa48("417", "418", "419"), !container)) {
          if (stryMutAct_9fa48("420")) {
            {}
          } else {
            stryCov_9fa48("420");
            return errorResponse(404, stryMutAct_9fa48("421") ? `` : (stryCov_9fa48("421"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("424") ? container.status === "ACTIVE" : stryMutAct_9fa48("423") ? false : stryMutAct_9fa48("422") ? true : (stryCov_9fa48("422", "423", "424"), container.status !== (stryMutAct_9fa48("425") ? "" : (stryCov_9fa48("425"), "ACTIVE")))) {
          if (stryMutAct_9fa48("426")) {
            {}
          } else {
            stryCov_9fa48("426");
            return errorResponse(409, stryMutAct_9fa48("427") ? `` : (stryCov_9fa48("427"), `Solo se puede reportar desborde en contenedores activos. Estado actual: ${container.status}`), path);
          }
        }
        const updated = reportOverflowFixture(id);
        return NextResponse.json(updated, stryMutAct_9fa48("428") ? {} : (stryCov_9fa48("428"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("429")) {
        {}
      } else {
        stryCov_9fa48("429");
        return handleRouteError(error, path, stryMutAct_9fa48("430") ? "" : (stryCov_9fa48("430"), "No se pudo reportar el desborde del contenedor."));
      }
    }
  }
}