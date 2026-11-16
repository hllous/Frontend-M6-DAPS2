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
import { inboxPageSchema } from "@/lib/integration-monitor";
import { invalidQueryResponse, jsonNoStore, noStore, parseInboxQuery, validatedBackendResponse } from "@/lib/integration-monitor-bff";
import { listInboxFixtures } from "@/mocks/integration-monitor-fixtures";
const BACKEND_QUERY_KEYS = ["status", "eventType", "sourceModule", "from", "to", "page", "pageSize"] as const;
export async function GET(request: Request) {
  if (stryMutAct_9fa48("2007")) {
    {}
  } else {
    stryCov_9fa48("2007");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2008")) {
        {}
      } else {
        stryCov_9fa48("2008");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("2009") ? {} : (stryCov_9fa48("2009"), {
          capability: stryMutAct_9fa48("2010") ? "" : (stryCov_9fa48("2010"), "integrationMonitor:view"),
          fallbackMessage: stryMutAct_9fa48("2011") ? "" : (stryCov_9fa48("2011"), "No se pudieron cargar los eventos recibidos."),
          throwOnError: stryMutAct_9fa48("2012") ? false : (stryCov_9fa48("2012"), true)
        }));
        const parsedQuery = parseInboxQuery(new URL(request.url));
        if (stryMutAct_9fa48("2015") ? false : stryMutAct_9fa48("2014") ? true : stryMutAct_9fa48("2013") ? parsedQuery.success : (stryCov_9fa48("2013", "2014", "2015"), !parsedQuery.success)) return invalidQueryResponse(path, stryMutAct_9fa48("2016") ? "" : (stryCov_9fa48("2016"), "Los filtros de eventos recibidos no son válidos."));
        if (stryMutAct_9fa48("2018") ? false : stryMutAct_9fa48("2017") ? true : (stryCov_9fa48("2017", "2018"), backendMode(session))) {
          if (stryMutAct_9fa48("2019")) {
            {}
          } else {
            stryCov_9fa48("2019");
            const response = await fetchBackend(request, stryMutAct_9fa48("2020") ? `` : (stryCov_9fa48("2020"), `/events/inbox${backendQuery(parsedQuery.data, BACKEND_QUERY_KEYS)}`), stryMutAct_9fa48("2021") ? "" : (stryCov_9fa48("2021"), "integrationMonitor:view"), stryMutAct_9fa48("2022") ? {} : (stryCov_9fa48("2022"), {
              cache: stryMutAct_9fa48("2023") ? "" : (stryCov_9fa48("2023"), "no-store")
            }));
            return validatedBackendResponse(response, inboxPageSchema, path, stryMutAct_9fa48("2024") ? "" : (stryCov_9fa48("2024"), "No se pudo obtener información válida de eventos recibidos. Reintente en unos segundos."));
          }
        }
        return jsonNoStore(inboxPageSchema.parse(listInboxFixtures(parsedQuery.data)));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2025")) {
        {}
      } else {
        stryCov_9fa48("2025");
        return noStore(mapSessionError(error, path, stryMutAct_9fa48("2026") ? "" : (stryCov_9fa48("2026"), "No se pudieron cargar los eventos recibidos.")));
      }
    }
  }
}