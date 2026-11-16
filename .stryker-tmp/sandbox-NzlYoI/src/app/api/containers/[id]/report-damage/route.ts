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
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, reportDamageFixture } from "@/lib/containers-fixtures";
import { reportDamageInputSchema } from "@/lib/containers";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("369")) {
    {}
  } else {
    stryCov_9fa48("369");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("370")) {
    {}
  } else {
    stryCov_9fa48("370");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("371")) {
        {}
      } else {
        stryCov_9fa48("371");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("373") ? {} : (stryCov_9fa48("373"), {
          capability: stryMutAct_9fa48("374") ? "" : (stryCov_9fa48("374"), "container:report"),
          capabilityMessage: stryMutAct_9fa48("375") ? "" : (stryCov_9fa48("375"), "No tiene permisos para reportar daños de contenedores."),
          throwOnError: stryMutAct_9fa48("376") ? false : (stryCov_9fa48("376"), true)
        }));
        const parsed = await parseJsonBody(request, reportDamageInputSchema, path);
        if (stryMutAct_9fa48("378") ? false : stryMutAct_9fa48("377") ? true : (stryCov_9fa48("377", "378"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("380") ? false : stryMutAct_9fa48("379") ? true : (stryCov_9fa48("379", "380"), backendMode(session))) {
          if (stryMutAct_9fa48("381")) {
            {}
          } else {
            stryCov_9fa48("381");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("382") ? `` : (stryCov_9fa48("382"), `/containers/${pathId(id)}/report-damage`), stryMutAct_9fa48("383") ? "" : (stryCov_9fa48("383"), "container:report"), stryMutAct_9fa48("384") ? {} : (stryCov_9fa48("384"), {
              method: stryMutAct_9fa48("385") ? "" : (stryCov_9fa48("385"), "POST"),
              headers: stryMutAct_9fa48("386") ? {} : (stryCov_9fa48("386"), {
                "content-type": stryMutAct_9fa48("387") ? "" : (stryCov_9fa48("387"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("390") ? false : stryMutAct_9fa48("389") ? true : stryMutAct_9fa48("388") ? container : (stryCov_9fa48("388", "389", "390"), !container)) {
          if (stryMutAct_9fa48("391")) {
            {}
          } else {
            stryCov_9fa48("391");
            return errorResponse(404, stryMutAct_9fa48("392") ? `` : (stryCov_9fa48("392"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("395") ? container.status === "ACTIVE" : stryMutAct_9fa48("394") ? false : stryMutAct_9fa48("393") ? true : (stryCov_9fa48("393", "394", "395"), container.status !== (stryMutAct_9fa48("396") ? "" : (stryCov_9fa48("396"), "ACTIVE")))) {
          if (stryMutAct_9fa48("397")) {
            {}
          } else {
            stryCov_9fa48("397");
            return errorResponse(409, stryMutAct_9fa48("398") ? `` : (stryCov_9fa48("398"), `Solo se puede reportar daño en contenedores activos. Estado actual: ${container.status}`), path);
          }
        }
        const updated = reportDamageFixture(id, parsed.data);
        return NextResponse.json(updated, stryMutAct_9fa48("399") ? {} : (stryCov_9fa48("399"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("400")) {
        {}
      } else {
        stryCov_9fa48("400");
        return handleRouteError(error, path, stryMutAct_9fa48("401") ? "" : (stryCov_9fa48("401"), "No se pudo reportar el daño del contenedor."));
      }
    }
  }
}