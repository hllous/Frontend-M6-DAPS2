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
import { getContainerFixture, removeContainerFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("339")) {
    {}
  } else {
    stryCov_9fa48("339");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("340")) {
    {}
  } else {
    stryCov_9fa48("340");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("341")) {
        {}
      } else {
        stryCov_9fa48("341");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("343") ? {} : (stryCov_9fa48("343"), {
          office: stryMutAct_9fa48("344") ? false : (stryCov_9fa48("344"), true),
          officeMessage: stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), "No tiene permisos para retirar contenedores."),
          capability: stryMutAct_9fa48("346") ? "" : (stryCov_9fa48("346"), "container:manage"),
          capabilityMessage: stryMutAct_9fa48("347") ? "" : (stryCov_9fa48("347"), "No tiene permisos para retirar contenedores."),
          throwOnError: stryMutAct_9fa48("348") ? false : (stryCov_9fa48("348"), true)
        }));
        if (stryMutAct_9fa48("350") ? false : stryMutAct_9fa48("349") ? true : (stryCov_9fa48("349", "350"), backendMode(session))) {
          if (stryMutAct_9fa48("351")) {
            {}
          } else {
            stryCov_9fa48("351");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("352") ? `` : (stryCov_9fa48("352"), `/containers/${pathId(id)}/remove`), stryMutAct_9fa48("353") ? "" : (stryCov_9fa48("353"), "container:manage"), stryMutAct_9fa48("354") ? {} : (stryCov_9fa48("354"), {
              method: stryMutAct_9fa48("355") ? "" : (stryCov_9fa48("355"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("358") ? false : stryMutAct_9fa48("357") ? true : stryMutAct_9fa48("356") ? container : (stryCov_9fa48("356", "357", "358"), !container)) return errorResponse(404, stryMutAct_9fa48("359") ? `` : (stryCov_9fa48("359"), `Contenedor ${id} no encontrado.`), path);
        if (stryMutAct_9fa48("362") ? container.status === "DAMAGED" : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362"), container.status !== (stryMutAct_9fa48("363") ? "" : (stryCov_9fa48("363"), "DAMAGED")))) {
          if (stryMutAct_9fa48("364")) {
            {}
          } else {
            stryCov_9fa48("364");
            return errorResponse(409, stryMutAct_9fa48("365") ? `` : (stryCov_9fa48("365"), `Solo se pueden retirar contenedores dañados. Estado actual: ${container.status}`), path);
          }
        }
        return NextResponse.json(removeContainerFixture(id), stryMutAct_9fa48("366") ? {} : (stryCov_9fa48("366"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("367")) {
        {}
      } else {
        stryCov_9fa48("367");
        return handleRouteError(error, path, stryMutAct_9fa48("368") ? "" : (stryCov_9fa48("368"), "No se pudo retirar el contenedor."));
      }
    }
  }
}