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
import { addDisposalSiteFixture, filterDisposalSiteFixtures, paginateDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { disposalSiteCreateInputSchema, disposalSiteTypeSchema, type DisposalSiteQuery } from "@/lib/disposal-sites";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseQuery(url: URL): DisposalSiteQuery {
  if (stryMutAct_9fa48("1028")) {
    {}
  } else {
    stryCov_9fa48("1028");
    const active = url.searchParams.get(stryMutAct_9fa48("1029") ? "" : (stryCov_9fa48("1029"), "active"));
    const siteType = disposalSiteTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("1030") ? "" : (stryCov_9fa48("1030"), "siteType")));
    return stryMutAct_9fa48("1031") ? {} : (stryCov_9fa48("1031"), {
      active: (stryMutAct_9fa48("1034") ? active !== null : stryMutAct_9fa48("1033") ? false : stryMutAct_9fa48("1032") ? true : (stryCov_9fa48("1032", "1033", "1034"), active === null)) ? undefined : stryMutAct_9fa48("1037") ? active !== "true" : stryMutAct_9fa48("1036") ? false : stryMutAct_9fa48("1035") ? true : (stryCov_9fa48("1035", "1036", "1037"), active === (stryMutAct_9fa48("1038") ? "" : (stryCov_9fa48("1038"), "true"))),
      siteType: siteType.success ? siteType.data : undefined,
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("1039")) {
    {}
  } else {
    stryCov_9fa48("1039");
    return authorize(request, stryMutAct_9fa48("1040") ? {} : (stryCov_9fa48("1040"), {
      office: stryMutAct_9fa48("1041") ? false : (stryCov_9fa48("1041"), true),
      officeMessage: stryMutAct_9fa48("1042") ? "" : (stryCov_9fa48("1042"), "Solo Oficina puede administrar sitios de disposición."),
      capability: stryMutAct_9fa48("1043") ? "" : (stryCov_9fa48("1043"), "disposalSite:manage"),
      throwOnError: stryMutAct_9fa48("1044") ? false : (stryCov_9fa48("1044"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("1045")) {
    {}
  } else {
    stryCov_9fa48("1045");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1046")) {
        {}
      } else {
        stryCov_9fa48("1046");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        if (stryMutAct_9fa48("1048") ? false : stryMutAct_9fa48("1047") ? true : (stryCov_9fa48("1047", "1048"), backendMode(session))) {
          if (stryMutAct_9fa48("1049")) {
            {}
          } else {
            stryCov_9fa48("1049");
            const response = await fetchBackend(request, stryMutAct_9fa48("1050") ? `` : (stryCov_9fa48("1050"), `/disposal-sites${backendQuery(query, stryMutAct_9fa48("1051") ? [] : (stryCov_9fa48("1051"), [stryMutAct_9fa48("1052") ? "" : (stryCov_9fa48("1052"), "active"), stryMutAct_9fa48("1053") ? "" : (stryCov_9fa48("1053"), "siteType"), stryMutAct_9fa48("1054") ? "" : (stryCov_9fa48("1054"), "search"), stryMutAct_9fa48("1055") ? "" : (stryCov_9fa48("1055"), "page"), stryMutAct_9fa48("1056") ? "" : (stryCov_9fa48("1056"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateDisposalSiteFixtures(filterDisposalSiteFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1057")) {
        {}
      } else {
        stryCov_9fa48("1057");
        if (stryMutAct_9fa48("1059") ? false : stryMutAct_9fa48("1058") ? true : (stryCov_9fa48("1058", "1059"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1060") ? "" : (stryCov_9fa48("1060"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1062") ? false : stryMutAct_9fa48("1061") ? true : (stryCov_9fa48("1061", "1062"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("1063") ? "" : (stryCov_9fa48("1063"), "No se pudieron cargar los sitios de disposición."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("1064")) {
    {}
  } else {
    stryCov_9fa48("1064");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1065")) {
        {}
      } else {
        stryCov_9fa48("1065");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, disposalSiteCreateInputSchema, path);
        if (stryMutAct_9fa48("1067") ? false : stryMutAct_9fa48("1066") ? true : (stryCov_9fa48("1066", "1067"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("1069") ? false : stryMutAct_9fa48("1068") ? true : (stryCov_9fa48("1068", "1069"), backendMode(session))) {
          if (stryMutAct_9fa48("1070")) {
            {}
          } else {
            stryCov_9fa48("1070");
            const response = await fetchBackend(request, stryMutAct_9fa48("1071") ? "" : (stryCov_9fa48("1071"), "/disposal-sites"), stryMutAct_9fa48("1072") ? "" : (stryCov_9fa48("1072"), "disposalSite:manage"), stryMutAct_9fa48("1073") ? {} : (stryCov_9fa48("1073"), {
              method: stryMutAct_9fa48("1074") ? "" : (stryCov_9fa48("1074"), "POST"),
              headers: stryMutAct_9fa48("1075") ? {} : (stryCov_9fa48("1075"), {
                "content-type": stryMutAct_9fa48("1076") ? "" : (stryCov_9fa48("1076"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const created = stryMutAct_9fa48("1077") ? {} : (stryCov_9fa48("1077"), {
          id: stryMutAct_9fa48("1078") ? `` : (stryCov_9fa48("1078"), `ds-${Date.now()}`),
          ...parsed.data,
          active: stryMutAct_9fa48("1079") ? false : (stryCov_9fa48("1079"), true)
        });
        if (stryMutAct_9fa48("1080")) {
          ;
        } else {
          stryCov_9fa48("1080");
          addDisposalSiteFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("1081") ? {} : (stryCov_9fa48("1081"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1082")) {
        {}
      } else {
        stryCov_9fa48("1082");
        if (stryMutAct_9fa48("1084") ? false : stryMutAct_9fa48("1083") ? true : (stryCov_9fa48("1083", "1084"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1085") ? "" : (stryCov_9fa48("1085"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1087") ? false : stryMutAct_9fa48("1086") ? true : (stryCov_9fa48("1086", "1087"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("1089") ? false : stryMutAct_9fa48("1088") ? true : (stryCov_9fa48("1088", "1089"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("1090") ? "" : (stryCov_9fa48("1090"), "No se pudo crear el sitio de disposición."));
      }
    }
  }
}