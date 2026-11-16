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
import { backendMode, authorize, errorResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { outboxDetailSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { getOutboxFixture } from "@/mocks/integration-monitor-fixtures";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
export async function GET(request: Request, context: RouteContext) {
  if (stryMutAct_9fa48("2107")) {
    {}
  } else {
    stryCov_9fa48("2107");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2108")) {
        {}
      } else {
        stryCov_9fa48("2108");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("2109") ? {} : (stryCov_9fa48("2109"), {
          capability: stryMutAct_9fa48("2110") ? "" : (stryCov_9fa48("2110"), "integrationMonitor:manage"),
          fallbackMessage: stryMutAct_9fa48("2111") ? "" : (stryCov_9fa48("2111"), "No se pudo cargar el detalle del evento."),
          throwOnError: stryMutAct_9fa48("2112") ? false : (stryCov_9fa48("2112"), true)
        }));
        const {
          id
        } = await context.params;
        if (stryMutAct_9fa48("2115") ? false : stryMutAct_9fa48("2114") ? true : stryMutAct_9fa48("2113") ? outboxDetailSchema.shape.id.safeParse(id).success : (stryCov_9fa48("2113", "2114", "2115"), !outboxDetailSchema.shape.id.safeParse(id).success)) {
          if (stryMutAct_9fa48("2116")) {
            {}
          } else {
            stryCov_9fa48("2116");
            return noStore(errorResponse(400, stryMutAct_9fa48("2117") ? "" : (stryCov_9fa48("2117"), "El identificador del evento no es válido."), path));
          }
        }
        if (stryMutAct_9fa48("2119") ? false : stryMutAct_9fa48("2118") ? true : (stryCov_9fa48("2118", "2119"), backendMode(session))) {
          if (stryMutAct_9fa48("2120")) {
            {}
          } else {
            stryCov_9fa48("2120");
            const response = await fetchBackend(request, stryMutAct_9fa48("2121") ? `` : (stryCov_9fa48("2121"), `/events/outbox/${pathId(id)}`), stryMutAct_9fa48("2122") ? "" : (stryCov_9fa48("2122"), "integrationMonitor:manage"), stryMutAct_9fa48("2123") ? {} : (stryCov_9fa48("2123"), {
              cache: stryMutAct_9fa48("2124") ? "" : (stryCov_9fa48("2124"), "no-store")
            }));
            return validatedBackendResponse(response, outboxDetailSchema, path, stryMutAct_9fa48("2125") ? "" : (stryCov_9fa48("2125"), "No se pudo obtener información válida del detalle del evento. Reintente en unos segundos."));
          }
        }
        const detail = getOutboxFixture(id);
        return detail ? jsonNoStore(outboxDetailSchema.parse(detail)) : noStore(errorResponse(404, stryMutAct_9fa48("2126") ? "" : (stryCov_9fa48("2126"), "No se encontró el evento saliente."), path));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2127")) {
        {}
      } else {
        stryCov_9fa48("2127");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("2128") ? "" : (stryCov_9fa48("2128"), "No se pudo cargar el detalle del evento.")));
      }
    }
  }
}