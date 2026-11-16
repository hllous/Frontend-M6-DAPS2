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
import { outboxEventSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { getOutboxFixture, retryOutboxFixture } from "@/mocks/integration-monitor-fixtures";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
export async function POST(request: Request, context: RouteContext) {
  if (stryMutAct_9fa48("2074")) {
    {}
  } else {
    stryCov_9fa48("2074");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2075")) {
        {}
      } else {
        stryCov_9fa48("2075");
        const {
          session,
          scenario
        } = authorize(request, stryMutAct_9fa48("2076") ? {} : (stryCov_9fa48("2076"), {
          capability: stryMutAct_9fa48("2077") ? "" : (stryCov_9fa48("2077"), "integrationMonitor:manage"),
          fallbackMessage: stryMutAct_9fa48("2078") ? "" : (stryCov_9fa48("2078"), "No se pudo reintentar el evento."),
          throwOnError: stryMutAct_9fa48("2079") ? false : (stryCov_9fa48("2079"), true)
        }));
        const {
          id
        } = await context.params;
        if (stryMutAct_9fa48("2082") ? false : stryMutAct_9fa48("2081") ? true : stryMutAct_9fa48("2080") ? outboxEventSchema.shape.id.safeParse(id).success : (stryCov_9fa48("2080", "2081", "2082"), !outboxEventSchema.shape.id.safeParse(id).success)) {
          if (stryMutAct_9fa48("2083")) {
            {}
          } else {
            stryCov_9fa48("2083");
            return noStore(errorResponse(400, stryMutAct_9fa48("2084") ? "" : (stryCov_9fa48("2084"), "El identificador del evento no es válido."), path));
          }
        }
        if (stryMutAct_9fa48("2086") ? false : stryMutAct_9fa48("2085") ? true : (stryCov_9fa48("2085", "2086"), backendMode(session))) {
          if (stryMutAct_9fa48("2087")) {
            {}
          } else {
            stryCov_9fa48("2087");
            const response = await fetchBackend(request, stryMutAct_9fa48("2088") ? `` : (stryCov_9fa48("2088"), `/events/outbox/${pathId(id)}/retry`), stryMutAct_9fa48("2089") ? "" : (stryCov_9fa48("2089"), "integrationMonitor:manage"), stryMutAct_9fa48("2090") ? {} : (stryCov_9fa48("2090"), {
              method: stryMutAct_9fa48("2091") ? "" : (stryCov_9fa48("2091"), "POST"),
              cache: stryMutAct_9fa48("2092") ? "" : (stryCov_9fa48("2092"), "no-store")
            }));
            return validatedBackendResponse(response, outboxEventSchema, path, stryMutAct_9fa48("2093") ? "" : (stryCov_9fa48("2093"), "No se pudo obtener información válida del reintento. Reintente en unos segundos."));
          }
        }
        const current = getOutboxFixture(id);
        if (stryMutAct_9fa48("2096") ? false : stryMutAct_9fa48("2095") ? true : stryMutAct_9fa48("2094") ? current : (stryCov_9fa48("2094", "2095", "2096"), !current)) return noStore(errorResponse(404, stryMutAct_9fa48("2097") ? "" : (stryCov_9fa48("2097"), "No se encontró el evento saliente."), path));
        if (stryMutAct_9fa48("2100") ? current.status === "FAILED" : stryMutAct_9fa48("2099") ? false : stryMutAct_9fa48("2098") ? true : (stryCov_9fa48("2098", "2099", "2100"), current.status !== (stryMutAct_9fa48("2101") ? "" : (stryCov_9fa48("2101"), "FAILED")))) {
          if (stryMutAct_9fa48("2102")) {
            {}
          } else {
            stryCov_9fa48("2102");
            return noStore(errorResponse(409, stryMutAct_9fa48("2103") ? "" : (stryCov_9fa48("2103"), "El evento ya no está fallido o cambió durante el reintento."), path));
          }
        }
        const updated = retryOutboxFixture(id, scenario.actor.userId);
        return updated ? jsonNoStore(outboxEventSchema.parse(updated)) : noStore(errorResponse(409, stryMutAct_9fa48("2104") ? "" : (stryCov_9fa48("2104"), "El evento ya cambió durante el reintento."), path));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2105")) {
        {}
      } else {
        stryCov_9fa48("2105");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("2106") ? "" : (stryCov_9fa48("2106"), "No se pudo reintentar el evento.")));
      }
    }
  }
}