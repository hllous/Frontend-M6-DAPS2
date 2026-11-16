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
import { getContainerFixture, startRepairFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("479")) {
    {}
  } else {
    stryCov_9fa48("479");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("480")) {
    {}
  } else {
    stryCov_9fa48("480");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("481")) {
        {}
      } else {
        stryCov_9fa48("481");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("483") ? {} : (stryCov_9fa48("483"), {
          office: stryMutAct_9fa48("484") ? false : (stryCov_9fa48("484"), true),
          officeMessage: stryMutAct_9fa48("485") ? "" : (stryCov_9fa48("485"), "No tiene permisos para iniciar reparaciones de contenedores."),
          capability: stryMutAct_9fa48("486") ? "" : (stryCov_9fa48("486"), "container:manage"),
          capabilityMessage: stryMutAct_9fa48("487") ? "" : (stryCov_9fa48("487"), "No tiene permisos para iniciar reparaciones de contenedores."),
          throwOnError: stryMutAct_9fa48("488") ? false : (stryCov_9fa48("488"), true)
        }));
        if (stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : (stryCov_9fa48("489", "490"), backendMode(session))) {
          if (stryMutAct_9fa48("491")) {
            {}
          } else {
            stryCov_9fa48("491");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("492") ? `` : (stryCov_9fa48("492"), `/containers/${pathId(id)}/start-repair`), stryMutAct_9fa48("493") ? "" : (stryCov_9fa48("493"), "container:manage"), stryMutAct_9fa48("494") ? {} : (stryCov_9fa48("494"), {
              method: stryMutAct_9fa48("495") ? "" : (stryCov_9fa48("495"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("498") ? false : stryMutAct_9fa48("497") ? true : stryMutAct_9fa48("496") ? container : (stryCov_9fa48("496", "497", "498"), !container)) return errorResponse(404, stryMutAct_9fa48("499") ? `` : (stryCov_9fa48("499"), `Contenedor ${id} no encontrado.`), path);
        if (stryMutAct_9fa48("502") ? container.status === "DAMAGED" : stryMutAct_9fa48("501") ? false : stryMutAct_9fa48("500") ? true : (stryCov_9fa48("500", "501", "502"), container.status !== (stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), "DAMAGED")))) {
          if (stryMutAct_9fa48("504")) {
            {}
          } else {
            stryCov_9fa48("504");
            return errorResponse(409, stryMutAct_9fa48("505") ? `` : (stryCov_9fa48("505"), `Solo se puede iniciar la reparación de contenedores dañados. Estado actual: ${container.status}`), path);
          }
        }
        return NextResponse.json(startRepairFixture(id), stryMutAct_9fa48("506") ? {} : (stryCov_9fa48("506"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("507")) {
        {}
      } else {
        stryCov_9fa48("507");
        return handleRouteError(error, path, stryMutAct_9fa48("508") ? "" : (stryCov_9fa48("508"), "No se pudo iniciar la reparación del contenedor."));
      }
    }
  }
}