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
import { fetchBackend } from "@/lib/bff-backend";
import { retryFailedInputSchema, retryFailedResponseSchema } from "@/lib/integration-monitor";
import { jsonNoStore, noStore, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { retryFailedOutboxFixtures } from "@/mocks/integration-monitor-fixtures";
export async function POST(request: Request) {
  if (stryMutAct_9fa48("2027")) {
    {}
  } else {
    stryCov_9fa48("2027");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2028")) {
        {}
      } else {
        stryCov_9fa48("2028");
        const {
          session,
          scenario
        } = authorize(request, stryMutAct_9fa48("2029") ? {} : (stryCov_9fa48("2029"), {
          capability: stryMutAct_9fa48("2030") ? "" : (stryCov_9fa48("2030"), "integrationMonitor:manage"),
          fallbackMessage: stryMutAct_9fa48("2031") ? "" : (stryCov_9fa48("2031"), "No se pudieron reintentar los eventos fallidos."),
          throwOnError: stryMutAct_9fa48("2032") ? false : (stryCov_9fa48("2032"), true)
        }));
        let body: unknown;
        try {
          if (stryMutAct_9fa48("2033")) {
            {}
          } else {
            stryCov_9fa48("2033");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("2034")) {
            {}
          } else {
            stryCov_9fa48("2034");
            return noStore(errorResponse(400, stryMutAct_9fa48("2035") ? "" : (stryCov_9fa48("2035"), "El cuerpo de la solicitud no es un JSON válido."), path));
          }
        }
        const parsedBody = retryFailedInputSchema.safeParse(body);
        if (stryMutAct_9fa48("2038") ? false : stryMutAct_9fa48("2037") ? true : stryMutAct_9fa48("2036") ? parsedBody.success : (stryCov_9fa48("2036", "2037", "2038"), !parsedBody.success)) return noStore(errorResponse(400, stryMutAct_9fa48("2039") ? "" : (stryCov_9fa48("2039"), "Confirme el reintento e indique un límite entre 1 y 100."), path));
        if (stryMutAct_9fa48("2041") ? false : stryMutAct_9fa48("2040") ? true : (stryCov_9fa48("2040", "2041"), backendMode(session))) {
          if (stryMutAct_9fa48("2042")) {
            {}
          } else {
            stryCov_9fa48("2042");
            const response = await fetchBackend(request, stryMutAct_9fa48("2043") ? "" : (stryCov_9fa48("2043"), "/events/outbox/retry-failed"), stryMutAct_9fa48("2044") ? "" : (stryCov_9fa48("2044"), "integrationMonitor:manage"), stryMutAct_9fa48("2045") ? {} : (stryCov_9fa48("2045"), {
              method: stryMutAct_9fa48("2046") ? "" : (stryCov_9fa48("2046"), "POST"),
              headers: stryMutAct_9fa48("2047") ? {} : (stryCov_9fa48("2047"), {
                "content-type": stryMutAct_9fa48("2048") ? "" : (stryCov_9fa48("2048"), "application/json")
              }),
              body: JSON.stringify(parsedBody.data),
              cache: stryMutAct_9fa48("2049") ? "" : (stryCov_9fa48("2049"), "no-store")
            }));
            return validatedBackendResponse(response, retryFailedResponseSchema, path, stryMutAct_9fa48("2050") ? "" : (stryCov_9fa48("2050"), "No se pudo obtener información válida del resultado del reintento. Reintente en unos segundos."));
          }
        }
        return jsonNoStore(retryFailedResponseSchema.parse(retryFailedOutboxFixtures(stryMutAct_9fa48("2051") ? parsedBody.data.limit && 100 : (stryCov_9fa48("2051"), parsedBody.data.limit ?? 100), scenario.actor.userId)));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2052")) {
        {}
      } else {
        stryCov_9fa48("2052");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("2053") ? "" : (stryCov_9fa48("2053"), "No se pudieron reintentar los eventos fallidos.")));
      }
    }
  }
}