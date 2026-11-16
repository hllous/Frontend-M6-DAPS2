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
import { getContainerFixture, startRelocationFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("310")) {
    {}
  } else {
    stryCov_9fa48("310");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("311")) {
    {}
  } else {
    stryCov_9fa48("311");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("312")) {
        {}
      } else {
        stryCov_9fa48("312");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("314") ? {} : (stryCov_9fa48("314"), {
          capability: stryMutAct_9fa48("315") ? "" : (stryCov_9fa48("315"), "container:manage"),
          capabilityMessage: stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), "No tiene permisos para reubicar contenedores."),
          throwOnError: stryMutAct_9fa48("317") ? false : (stryCov_9fa48("317"), true)
        }));
        if (stryMutAct_9fa48("319") ? false : stryMutAct_9fa48("318") ? true : (stryCov_9fa48("318", "319"), backendMode(session))) {
          if (stryMutAct_9fa48("320")) {
            {}
          } else {
            stryCov_9fa48("320");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("321") ? `` : (stryCov_9fa48("321"), `/containers/${pathId(id)}/relocate`), stryMutAct_9fa48("322") ? "" : (stryCov_9fa48("322"), "container:manage"), stryMutAct_9fa48("323") ? {} : (stryCov_9fa48("323"), {
              method: stryMutAct_9fa48("324") ? "" : (stryCov_9fa48("324"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("327") ? false : stryMutAct_9fa48("326") ? true : stryMutAct_9fa48("325") ? container : (stryCov_9fa48("325", "326", "327"), !container)) {
          if (stryMutAct_9fa48("328")) {
            {}
          } else {
            stryCov_9fa48("328");
            return errorResponse(404, stryMutAct_9fa48("329") ? `` : (stryCov_9fa48("329"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("332") ? container.status === "ACTIVE" : stryMutAct_9fa48("331") ? false : stryMutAct_9fa48("330") ? true : (stryCov_9fa48("330", "331", "332"), container.status !== (stryMutAct_9fa48("333") ? "" : (stryCov_9fa48("333"), "ACTIVE")))) {
          if (stryMutAct_9fa48("334")) {
            {}
          } else {
            stryCov_9fa48("334");
            return errorResponse(409, stryMutAct_9fa48("335") ? `` : (stryCov_9fa48("335"), `Solo se puede iniciar la reubicación en contenedores activos. Estado actual: ${container.status}`), path);
          }
        }
        const updated = startRelocationFixture(id);
        return NextResponse.json(updated, stryMutAct_9fa48("336") ? {} : (stryCov_9fa48("336"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("337")) {
        {}
      } else {
        stryCov_9fa48("337");
        return handleRouteError(error, path, stryMutAct_9fa48("338") ? "" : (stryCov_9fa48("338"), "No se pudo iniciar la reubicación del contenedor."));
      }
    }
  }
}