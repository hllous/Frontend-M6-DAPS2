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
import { backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { containerFixtures, updateContainerFixture } from "@/lib/containers-fixtures";
import { updateContainerInputSchema } from "@/lib/containers";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("431")) {
    {}
  } else {
    stryCov_9fa48("431");
    return (await context.params).id;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("432")) {
    {}
  } else {
    stryCov_9fa48("432");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("433")) {
        {}
      } else {
        stryCov_9fa48("433");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("435") ? false : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435"), backendMode(session))) {
          if (stryMutAct_9fa48("436")) {
            {}
          } else {
            stryCov_9fa48("436");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("437") ? `` : (stryCov_9fa48("437"), `/containers/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        const container = containerFixtures.find(stryMutAct_9fa48("438") ? () => undefined : (stryCov_9fa48("438"), c => stryMutAct_9fa48("441") ? c.id !== id : stryMutAct_9fa48("440") ? false : stryMutAct_9fa48("439") ? true : (stryCov_9fa48("439", "440", "441"), c.id === id)));
        if (stryMutAct_9fa48("444") ? false : stryMutAct_9fa48("443") ? true : stryMutAct_9fa48("442") ? container : (stryCov_9fa48("442", "443", "444"), !container)) {
          if (stryMutAct_9fa48("445")) {
            {}
          } else {
            stryCov_9fa48("445");
            return errorResponse(404, stryMutAct_9fa48("446") ? `` : (stryCov_9fa48("446"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        return NextResponse.json(container);
      }
    } catch (error) {
      if (stryMutAct_9fa48("447")) {
        {}
      } else {
        stryCov_9fa48("447");
        return handleRouteError(error, path, stryMutAct_9fa48("448") ? "" : (stryCov_9fa48("448"), "No se pudo cargar el contenedor."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("449")) {
    {}
  } else {
    stryCov_9fa48("449");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("450")) {
        {}
      } else {
        stryCov_9fa48("450");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);

        // Permission check: mirror cancel/route.ts inline actor-kind check
        if (stryMutAct_9fa48("453") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("452") ? false : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452", "453"), scenario.actor.kind !== (stryMutAct_9fa48("454") ? "" : (stryCov_9fa48("454"), "OFFICE")))) {
          if (stryMutAct_9fa48("455")) {
            {}
          } else {
            stryCov_9fa48("455");
            return errorResponse(403, stryMutAct_9fa48("456") ? "" : (stryCov_9fa48("456"), "Solo el rol de Oficina puede gestionar contenedores."), path);
          }
        }
        const parsed = await parseJsonBody(request, updateContainerInputSchema, path);
        if (stryMutAct_9fa48("458") ? false : stryMutAct_9fa48("457") ? true : (stryCov_9fa48("457", "458"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("460") ? false : stryMutAct_9fa48("459") ? true : (stryCov_9fa48("459", "460"), backendMode(session))) {
          if (stryMutAct_9fa48("461")) {
            {}
          } else {
            stryCov_9fa48("461");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("462") ? `` : (stryCov_9fa48("462"), `/containers/${pathId(id)}`), stryMutAct_9fa48("463") ? "" : (stryCov_9fa48("463"), "container:manage"), stryMutAct_9fa48("464") ? {} : (stryCov_9fa48("464"), {
              method: stryMutAct_9fa48("465") ? "" : (stryCov_9fa48("465"), "PATCH"),
              headers: stryMutAct_9fa48("466") ? {} : (stryCov_9fa48("466"), {
                "content-type": stryMutAct_9fa48("467") ? "" : (stryCov_9fa48("467"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = containerFixtures.find(stryMutAct_9fa48("468") ? () => undefined : (stryCov_9fa48("468"), c => stryMutAct_9fa48("471") ? c.id !== id : stryMutAct_9fa48("470") ? false : stryMutAct_9fa48("469") ? true : (stryCov_9fa48("469", "470", "471"), c.id === id)));
        if (stryMutAct_9fa48("474") ? false : stryMutAct_9fa48("473") ? true : stryMutAct_9fa48("472") ? existing : (stryCov_9fa48("472", "473", "474"), !existing)) {
          if (stryMutAct_9fa48("475")) {
            {}
          } else {
            stryCov_9fa48("475");
            return errorResponse(404, stryMutAct_9fa48("476") ? `` : (stryCov_9fa48("476"), `Contenedor ${id} no encontrado.`), path);
          }
        }

        // Code and containerType are strictly immutable.
        const updated = updateContainerFixture(id, parsed.data);
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("477")) {
        {}
      } else {
        stryCov_9fa48("477");
        return handleRouteError(error, path, stryMutAct_9fa48("478") ? "" : (stryCov_9fa48("478"), "No se pudo actualizar el contenedor."));
      }
    }
  }
}