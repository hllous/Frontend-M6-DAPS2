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
import { auditPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseAuditQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listAuditFixtures } from "@/mocks/integration-monitor-fixtures";
const BACKEND_QUERY_KEYS = ["entityType", "entityId", "page", "pageSize"] as const;
export async function GET(request: Request) {
  if (stryMutAct_9fa48("122")) {
    {}
  } else {
    stryCov_9fa48("122");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("123")) {
        {}
      } else {
        stryCov_9fa48("123");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("124") ? {} : (stryCov_9fa48("124"), {
          capability: stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), "integrationMonitor:view"),
          fallbackMessage: stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), "No se pudo cargar el registro de actividad."),
          throwOnError: stryMutAct_9fa48("127") ? false : (stryCov_9fa48("127"), true)
        }));
        const parsedQuery = parseAuditQuery(new URL(request.url));
        if (stryMutAct_9fa48("130") ? false : stryMutAct_9fa48("129") ? true : stryMutAct_9fa48("128") ? parsedQuery.success : (stryCov_9fa48("128", "129", "130"), !parsedQuery.success)) return invalidQueryResponse(path, stryMutAct_9fa48("131") ? "" : (stryCov_9fa48("131"), "Los filtros del registro de actividad no son válidos."));
        if (stryMutAct_9fa48("133") ? false : stryMutAct_9fa48("132") ? true : (stryCov_9fa48("132", "133"), backendMode(session))) {
          if (stryMutAct_9fa48("134")) {
            {}
          } else {
            stryCov_9fa48("134");
            const response = await fetchBackend(request, stryMutAct_9fa48("135") ? `` : (stryCov_9fa48("135"), `/audit${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`), stryMutAct_9fa48("136") ? "" : (stryCov_9fa48("136"), "integrationMonitor:view"), stryMutAct_9fa48("137") ? {} : (stryCov_9fa48("137"), {
              cache: stryMutAct_9fa48("138") ? "" : (stryCov_9fa48("138"), "no-store")
            }));
            return validatedBackendResponse(response, auditPageSchema, path, stryMutAct_9fa48("139") ? "" : (stryCov_9fa48("139"), "No se pudo obtener información válida del registro de actividad. Reintente en unos segundos."));
          }
        }
        return jsonNoStore(auditPageSchema.parse(listAuditFixtures(parsedQuery.data)));
      }
    } catch (error) {
      if (stryMutAct_9fa48("140")) {
        {}
      } else {
        stryCov_9fa48("140");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), "No se pudo cargar el registro de actividad.")));
      }
    }
  }
}