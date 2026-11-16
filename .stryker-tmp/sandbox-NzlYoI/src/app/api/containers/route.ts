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
import { backendMode, backendQuery, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { addContainerFixture, filterContainerFixtures, containerFixtures, paginateContainerFixtures } from "@/lib/containers-fixtures";
import { createContainerInputSchema, containerStatusSchema, containerTypeSchema, type Container, type ContainerQuery } from "@/lib/containers";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseContainerQuery(url: URL): ContainerQuery {
  if (stryMutAct_9fa48("154")) {
    {}
  } else {
    stryCov_9fa48("154");
    const rawStatus = url.searchParams.get(stryMutAct_9fa48("155") ? "" : (stryCov_9fa48("155"), "status"));
    const rawType = url.searchParams.get(stryMutAct_9fa48("156") ? "" : (stryCov_9fa48("156"), "containerType"));
    return stryMutAct_9fa48("157") ? {} : (stryCov_9fa48("157"), {
      status: containerStatusSchema.safeParse(rawStatus).success ? rawStatus as ContainerQuery["status"] : undefined,
      containerType: containerTypeSchema.safeParse(rawType).success ? rawType as ContainerQuery["containerType"] : undefined,
      zoneId: stryMutAct_9fa48("158") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("158"), url.searchParams.get(stryMutAct_9fa48("159") ? "" : (stryCov_9fa48("159"), "zoneId")) ?? undefined),
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("160")) {
    {}
  } else {
    stryCov_9fa48("160");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("161")) {
        {}
      } else {
        stryCov_9fa48("161");
        const session = getRequiredSession(request);
        const query = parseContainerQuery(new URL(request.url));
        if (stryMutAct_9fa48("163") ? false : stryMutAct_9fa48("162") ? true : (stryCov_9fa48("162", "163"), backendMode(session))) {
          if (stryMutAct_9fa48("164")) {
            {}
          } else {
            stryCov_9fa48("164");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("165") ? `` : (stryCov_9fa48("165"), `/containers${backendQuery(query, stryMutAct_9fa48("166") ? [] : (stryCov_9fa48("166"), [stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), "status"), stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), "containerType"), stryMutAct_9fa48("169") ? "" : (stryCov_9fa48("169"), "zoneId"), stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), "search"), stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), "page"), stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), "pageSize")]))}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateContainerFixtures(filterContainerFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("173")) {
        {}
      } else {
        stryCov_9fa48("173");
        return handleRouteError(error, path, stryMutAct_9fa48("174") ? "" : (stryCov_9fa48("174"), "No se pudieron cargar los contenedores."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("175")) {
    {}
  } else {
    stryCov_9fa48("175");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("176")) {
        {}
      } else {
        stryCov_9fa48("176");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);

        // Permission check: mirror cancel/route.ts inline actor-kind check
        if (stryMutAct_9fa48("179") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("178") ? false : stryMutAct_9fa48("177") ? true : (stryCov_9fa48("177", "178", "179"), scenario.actor.kind !== (stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), "OFFICE")))) {
          if (stryMutAct_9fa48("181")) {
            {}
          } else {
            stryCov_9fa48("181");
            return errorResponse(403, stryMutAct_9fa48("182") ? "" : (stryCov_9fa48("182"), "Solo el rol de Oficina puede gestionar contenedores."), path);
          }
        }
        const parsed = await parseJsonBody(request, createContainerInputSchema, path);
        if (stryMutAct_9fa48("184") ? false : stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183", "184"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("186") ? false : stryMutAct_9fa48("185") ? true : (stryCov_9fa48("185", "186"), backendMode(session))) {
          if (stryMutAct_9fa48("187")) {
            {}
          } else {
            stryCov_9fa48("187");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("188") ? "" : (stryCov_9fa48("188"), "/containers"), stryMutAct_9fa48("189") ? "" : (stryCov_9fa48("189"), "container:manage"), stryMutAct_9fa48("190") ? {} : (stryCov_9fa48("190"), {
              method: stryMutAct_9fa48("191") ? "" : (stryCov_9fa48("191"), "POST"),
              headers: stryMutAct_9fa48("192") ? {} : (stryCov_9fa48("192"), {
                "content-type": stryMutAct_9fa48("193") ? "" : (stryCov_9fa48("193"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = containerFixtures.find(stryMutAct_9fa48("194") ? () => undefined : (stryCov_9fa48("194"), c => stryMutAct_9fa48("197") ? c.code.toLowerCase() !== parsed.data.code.toLowerCase() : stryMutAct_9fa48("196") ? false : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196", "197"), (stryMutAct_9fa48("198") ? c.code.toUpperCase() : (stryCov_9fa48("198"), c.code.toLowerCase())) === (stryMutAct_9fa48("199") ? parsed.data.code.toUpperCase() : (stryCov_9fa48("199"), parsed.data.code.toLowerCase())))));
        if (stryMutAct_9fa48("201") ? false : stryMutAct_9fa48("200") ? true : (stryCov_9fa48("200", "201"), existing)) {
          if (stryMutAct_9fa48("202")) {
            {}
          } else {
            stryCov_9fa48("202");
            return errorResponse(409, stryMutAct_9fa48("203") ? `` : (stryCov_9fa48("203"), `Ya existe un contenedor con el código ${parsed.data.code}.`), path);
          }
        }
        const newContainer: Container = stryMutAct_9fa48("204") ? {} : (stryCov_9fa48("204"), {
          id: stryMutAct_9fa48("205") ? `` : (stryCov_9fa48("205"), `cont-${Date.now()}`),
          ...parsed.data,
          status: stryMutAct_9fa48("206") ? "" : (stryCov_9fa48("206"), "ACTIVE")
        });
        if (stryMutAct_9fa48("207")) {
          ;
        } else {
          stryCov_9fa48("207");
          addContainerFixture(newContainer);
        }
        return NextResponse.json(newContainer, stryMutAct_9fa48("208") ? {} : (stryCov_9fa48("208"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("209")) {
        {}
      } else {
        stryCov_9fa48("209");
        return handleRouteError(error, path, stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), "No se pudo registrar el contenedor."));
      }
    }
  }
}