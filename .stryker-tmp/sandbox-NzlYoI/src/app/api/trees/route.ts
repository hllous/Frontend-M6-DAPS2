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
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { addTreeFixture, filterTreeFixtures, paginateTreeFixtures, treeFixtures } from "@/lib/tree-fixtures";
import { treeCreateInputSchema, type TreeQuery } from "@/lib/trees";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseQuery(url: URL): TreeQuery {
  if (stryMutAct_9fa48("5970")) {
    {}
  } else {
    stryCov_9fa48("5970");
    return stryMutAct_9fa48("5971") ? {} : (stryCov_9fa48("5971"), {
      active: url.searchParams.has(stryMutAct_9fa48("5972") ? "" : (stryCov_9fa48("5972"), "active")) ? stryMutAct_9fa48("5975") ? url.searchParams.get("active") !== "true" : stryMutAct_9fa48("5974") ? false : stryMutAct_9fa48("5973") ? true : (stryCov_9fa48("5973", "5974", "5975"), url.searchParams.get(stryMutAct_9fa48("5976") ? "" : (stryCov_9fa48("5976"), "active")) === (stryMutAct_9fa48("5977") ? "" : (stryCov_9fa48("5977"), "true"))) : undefined,
      zoneId: stryMutAct_9fa48("5978") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("5978"), url.searchParams.get(stryMutAct_9fa48("5979") ? "" : (stryCov_9fa48("5979"), "zoneId")) ?? undefined),
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("5980")) {
    {}
  } else {
    stryCov_9fa48("5980");
    return authorize(request, stryMutAct_9fa48("5981") ? {} : (stryCov_9fa48("5981"), {
      office: stryMutAct_9fa48("5982") ? false : (stryCov_9fa48("5982"), true),
      officeMessage: stryMutAct_9fa48("5983") ? "" : (stryCov_9fa48("5983"), "Solo Oficina puede administrar árboles."),
      capability: stryMutAct_9fa48("5984") ? "" : (stryCov_9fa48("5984"), "tree:manage"),
      throwOnError: stryMutAct_9fa48("5985") ? false : (stryCov_9fa48("5985"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("5986")) {
    {}
  } else {
    stryCov_9fa48("5986");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5987")) {
        {}
      } else {
        stryCov_9fa48("5987");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        if (stryMutAct_9fa48("5989") ? false : stryMutAct_9fa48("5988") ? true : (stryCov_9fa48("5988", "5989"), backendMode(session))) {
          if (stryMutAct_9fa48("5990")) {
            {}
          } else {
            stryCov_9fa48("5990");
            const response = await fetchBackend(request, stryMutAct_9fa48("5991") ? `` : (stryCov_9fa48("5991"), `/trees${backendQuery(query, stryMutAct_9fa48("5992") ? [] : (stryCov_9fa48("5992"), [stryMutAct_9fa48("5993") ? "" : (stryCov_9fa48("5993"), "active"), stryMutAct_9fa48("5994") ? "" : (stryCov_9fa48("5994"), "zoneId"), stryMutAct_9fa48("5995") ? "" : (stryCov_9fa48("5995"), "search"), stryMutAct_9fa48("5996") ? "" : (stryCov_9fa48("5996"), "page"), stryMutAct_9fa48("5997") ? "" : (stryCov_9fa48("5997"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateTreeFixtures(filterTreeFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5998")) {
        {}
      } else {
        stryCov_9fa48("5998");
        if (stryMutAct_9fa48("6000") ? false : stryMutAct_9fa48("5999") ? true : (stryCov_9fa48("5999", "6000"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6001") ? "" : (stryCov_9fa48("6001"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6003") ? false : stryMutAct_9fa48("6002") ? true : (stryCov_9fa48("6002", "6003"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6004") ? "" : (stryCov_9fa48("6004"), "No se pudieron cargar los árboles."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("6005")) {
    {}
  } else {
    stryCov_9fa48("6005");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6006")) {
        {}
      } else {
        stryCov_9fa48("6006");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, treeCreateInputSchema, path);
        if (stryMutAct_9fa48("6008") ? false : stryMutAct_9fa48("6007") ? true : (stryCov_9fa48("6007", "6008"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6010") ? false : stryMutAct_9fa48("6009") ? true : (stryCov_9fa48("6009", "6010"), backendMode(session))) {
          if (stryMutAct_9fa48("6011")) {
            {}
          } else {
            stryCov_9fa48("6011");
            const response = await fetchBackend(request, stryMutAct_9fa48("6012") ? "" : (stryCov_9fa48("6012"), "/trees"), stryMutAct_9fa48("6013") ? "" : (stryCov_9fa48("6013"), "tree:manage"), stryMutAct_9fa48("6014") ? {} : (stryCov_9fa48("6014"), {
              method: stryMutAct_9fa48("6015") ? "" : (stryCov_9fa48("6015"), "POST"),
              headers: stryMutAct_9fa48("6016") ? {} : (stryCov_9fa48("6016"), {
                "content-type": stryMutAct_9fa48("6017") ? "" : (stryCov_9fa48("6017"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        if (stryMutAct_9fa48("6020") ? treeFixtures.every(item => item.surveyCode.toLowerCase() === parsed.data.surveyCode.toLowerCase()) : stryMutAct_9fa48("6019") ? false : stryMutAct_9fa48("6018") ? true : (stryCov_9fa48("6018", "6019", "6020"), treeFixtures.some(stryMutAct_9fa48("6021") ? () => undefined : (stryCov_9fa48("6021"), item => stryMutAct_9fa48("6024") ? item.surveyCode.toLowerCase() !== parsed.data.surveyCode.toLowerCase() : stryMutAct_9fa48("6023") ? false : stryMutAct_9fa48("6022") ? true : (stryCov_9fa48("6022", "6023", "6024"), (stryMutAct_9fa48("6025") ? item.surveyCode.toUpperCase() : (stryCov_9fa48("6025"), item.surveyCode.toLowerCase())) === (stryMutAct_9fa48("6026") ? parsed.data.surveyCode.toUpperCase() : (stryCov_9fa48("6026"), parsed.data.surveyCode.toLowerCase()))))))) return errorResponse(409, stryMutAct_9fa48("6027") ? `` : (stryCov_9fa48("6027"), `Ya existe un árbol con el código de relevamiento '${parsed.data.surveyCode}'.`), path);
        const created = stryMutAct_9fa48("6028") ? {} : (stryCov_9fa48("6028"), {
          id: stryMutAct_9fa48("6029") ? `` : (stryCov_9fa48("6029"), `tree-${Date.now()}`),
          ...parsed.data,
          address: stryMutAct_9fa48("6030") ? parsed.data.address && null : (stryCov_9fa48("6030"), parsed.data.address ?? null),
          lat: stryMutAct_9fa48("6031") ? parsed.data.lat && null : (stryCov_9fa48("6031"), parsed.data.lat ?? null),
          lng: stryMutAct_9fa48("6032") ? parsed.data.lng && null : (stryCov_9fa48("6032"), parsed.data.lng ?? null),
          active: stryMutAct_9fa48("6033") ? parsed.data.active && true : (stryCov_9fa48("6033"), parsed.data.active ?? (stryMutAct_9fa48("6034") ? false : (stryCov_9fa48("6034"), true))),
          lastSurvey: null
        });
        if (stryMutAct_9fa48("6035")) {
          ;
        } else {
          stryCov_9fa48("6035");
          addTreeFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("6036") ? {} : (stryCov_9fa48("6036"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6037")) {
        {}
      } else {
        stryCov_9fa48("6037");
        if (stryMutAct_9fa48("6039") ? false : stryMutAct_9fa48("6038") ? true : (stryCov_9fa48("6038", "6039"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6040") ? "" : (stryCov_9fa48("6040"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6042") ? false : stryMutAct_9fa48("6041") ? true : (stryCov_9fa48("6041", "6042"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6044") ? false : stryMutAct_9fa48("6043") ? true : (stryCov_9fa48("6043", "6044"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6045") ? "" : (stryCov_9fa48("6045"), "No se pudo crear el árbol."));
      }
    }
  }
}