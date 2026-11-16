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
import { getContainerFixture, emptyContainerFixture } from "@/lib/containers-fixtures";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("281")) {
    {}
  } else {
    stryCov_9fa48("281");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("282")) {
    {}
  } else {
    stryCov_9fa48("282");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("283")) {
        {}
      } else {
        stryCov_9fa48("283");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("285") ? {} : (stryCov_9fa48("285"), {
          capability: stryMutAct_9fa48("286") ? "" : (stryCov_9fa48("286"), "container:empty"),
          capabilityMessage: stryMutAct_9fa48("287") ? "" : (stryCov_9fa48("287"), "No tiene permisos para vaciar contenedores."),
          throwOnError: stryMutAct_9fa48("288") ? false : (stryCov_9fa48("288"), true)
        }));
        if (stryMutAct_9fa48("290") ? false : stryMutAct_9fa48("289") ? true : (stryCov_9fa48("289", "290"), backendMode(session))) {
          if (stryMutAct_9fa48("291")) {
            {}
          } else {
            stryCov_9fa48("291");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("292") ? `` : (stryCov_9fa48("292"), `/containers/${pathId(id)}/empty`), stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), "container:empty"), stryMutAct_9fa48("294") ? {} : (stryCov_9fa48("294"), {
              method: stryMutAct_9fa48("295") ? "" : (stryCov_9fa48("295"), "POST")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("298") ? false : stryMutAct_9fa48("297") ? true : stryMutAct_9fa48("296") ? container : (stryCov_9fa48("296", "297", "298"), !container)) {
          if (stryMutAct_9fa48("299")) {
            {}
          } else {
            stryCov_9fa48("299");
            return errorResponse(404, stryMutAct_9fa48("300") ? `` : (stryCov_9fa48("300"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("303") ? container.status === "OVERFLOWED" : stryMutAct_9fa48("302") ? false : stryMutAct_9fa48("301") ? true : (stryCov_9fa48("301", "302", "303"), container.status !== (stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), "OVERFLOWED")))) {
          if (stryMutAct_9fa48("305")) {
            {}
          } else {
            stryCov_9fa48("305");
            return errorResponse(409, stryMutAct_9fa48("306") ? `` : (stryCov_9fa48("306"), `Solo se puede vaciar un contenedor en estado desbordado. Estado actual: ${container.status}`), path);
          }
        }
        const updated = emptyContainerFixture(id);
        return NextResponse.json(updated, stryMutAct_9fa48("307") ? {} : (stryCov_9fa48("307"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("308")) {
        {}
      } else {
        stryCov_9fa48("308");
        return handleRouteError(error, path, stryMutAct_9fa48("309") ? "" : (stryCov_9fa48("309"), "No se pudo registrar el vaciado del contenedor."));
      }
    }
  }
}