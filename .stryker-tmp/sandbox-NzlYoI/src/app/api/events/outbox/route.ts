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
import { backendMode, backendQuery, authorize, mapSessionError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { outboxPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseOutboxQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listOutboxFixtures } from "@/mocks/integration-monitor-fixtures";
const BACKEND_QUERY_KEYS = ["status", "eventType", "from", "to", "page", "pageSize"] as const;
export async function GET(request: Request) {
  if (stryMutAct_9fa48("2054")) {
    {}
  } else {
    stryCov_9fa48("2054");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2055")) {
        {}
      } else {
        stryCov_9fa48("2055");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("2056") ? {} : (stryCov_9fa48("2056"), {
          capability: stryMutAct_9fa48("2057") ? "" : (stryCov_9fa48("2057"), "integrationMonitor:view"),
          fallbackMessage: stryMutAct_9fa48("2058") ? "" : (stryCov_9fa48("2058"), "No se pudieron cargar los envíos a otras áreas."),
          throwOnError: stryMutAct_9fa48("2059") ? false : (stryCov_9fa48("2059"), true)
        }));
        const parsedQuery = parseOutboxQuery(new URL(request.url));
        if (stryMutAct_9fa48("2062") ? false : stryMutAct_9fa48("2061") ? true : stryMutAct_9fa48("2060") ? parsedQuery.success : (stryCov_9fa48("2060", "2061", "2062"), !parsedQuery.success)) return invalidQueryResponse(path, stryMutAct_9fa48("2063") ? "" : (stryCov_9fa48("2063"), "Los filtros de envíos a otras áreas no son válidos."));
        if (stryMutAct_9fa48("2065") ? false : stryMutAct_9fa48("2064") ? true : (stryCov_9fa48("2064", "2065"), backendMode(session))) {
          if (stryMutAct_9fa48("2066")) {
            {}
          } else {
            stryCov_9fa48("2066");
            const response = await fetchBackend(request, stryMutAct_9fa48("2067") ? `` : (stryCov_9fa48("2067"), `/events/outbox${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`), stryMutAct_9fa48("2068") ? "" : (stryCov_9fa48("2068"), "integrationMonitor:view"), stryMutAct_9fa48("2069") ? {} : (stryCov_9fa48("2069"), {
              cache: stryMutAct_9fa48("2070") ? "" : (stryCov_9fa48("2070"), "no-store")
            }));
            return validatedBackendResponse(response, outboxPageSchema, path, stryMutAct_9fa48("2071") ? "" : (stryCov_9fa48("2071"), "No se pudo obtener información válida de envíos a otras áreas. Reintente en unos segundos."));
          }
        }
        return jsonNoStore(outboxPageSchema.parse(listOutboxFixtures(parsedQuery.data)));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2072")) {
        {}
      } else {
        stryCov_9fa48("2072");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("2073") ? "" : (stryCov_9fa48("2073"), "No se pudieron cargar los envíos a otras áreas.")));
      }
    }
  }
}