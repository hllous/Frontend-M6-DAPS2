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
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { addRouteFixture, filterRouteFixtures, paginateRouteFixtures, routeFixtures } from "@/lib/routes-fixtures";
import { createRouteInputSchema, type Route, type RouteQuery } from "@/lib/routes";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseRouteQuery(url: URL): RouteQuery {
  if (stryMutAct_9fa48("3914")) {
    {}
  } else {
    stryCov_9fa48("3914");
    return stryMutAct_9fa48("3915") ? {} : (stryCov_9fa48("3915"), {
      active: url.searchParams.has(stryMutAct_9fa48("3916") ? "" : (stryCov_9fa48("3916"), "active")) ? stryMutAct_9fa48("3919") ? url.searchParams.get("active") !== "true" : stryMutAct_9fa48("3918") ? false : stryMutAct_9fa48("3917") ? true : (stryCov_9fa48("3917", "3918", "3919"), url.searchParams.get(stryMutAct_9fa48("3920") ? "" : (stryCov_9fa48("3920"), "active")) === (stryMutAct_9fa48("3921") ? "" : (stryCov_9fa48("3921"), "true"))) : undefined,
      zoneId: stryMutAct_9fa48("3922") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("3922"), url.searchParams.get(stryMutAct_9fa48("3923") ? "" : (stryCov_9fa48("3923"), "zoneId")) ?? undefined),
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3924")) {
    {}
  } else {
    stryCov_9fa48("3924");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3925")) {
        {}
      } else {
        stryCov_9fa48("3925");
        const session = getRequiredSession(request);
        const query = parseRouteQuery(new URL(request.url));
        if (stryMutAct_9fa48("3927") ? false : stryMutAct_9fa48("3926") ? true : (stryCov_9fa48("3926", "3927"), backendMode(session))) {
          if (stryMutAct_9fa48("3928")) {
            {}
          } else {
            stryCov_9fa48("3928");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3929") ? `` : (stryCov_9fa48("3929"), `/routes${backendQuery(query, stryMutAct_9fa48("3930") ? [] : (stryCov_9fa48("3930"), [stryMutAct_9fa48("3931") ? "" : (stryCov_9fa48("3931"), "active"), stryMutAct_9fa48("3932") ? "" : (stryCov_9fa48("3932"), "zoneId"), stryMutAct_9fa48("3933") ? "" : (stryCov_9fa48("3933"), "search"), stryMutAct_9fa48("3934") ? "" : (stryCov_9fa48("3934"), "page"), stryMutAct_9fa48("3935") ? "" : (stryCov_9fa48("3935"), "pageSize")]))}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateRouteFixtures(filterRouteFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3936")) {
        {}
      } else {
        stryCov_9fa48("3936");
        return handleRouteError(error, path, stryMutAct_9fa48("3937") ? "" : (stryCov_9fa48("3937"), "No se pudieron cargar los recorridos."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("3938")) {
    {}
  } else {
    stryCov_9fa48("3938");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3939")) {
        {}
      } else {
        stryCov_9fa48("3939");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("3941") ? {} : (stryCov_9fa48("3941"), {
          office: stryMutAct_9fa48("3942") ? false : (stryCov_9fa48("3942"), true),
          officeMessage: stryMutAct_9fa48("3943") ? "" : (stryCov_9fa48("3943"), "Solo el rol de Oficina puede crear recorridos."),
          capability: stryMutAct_9fa48("3944") ? "" : (stryCov_9fa48("3944"), "route:manage"),
          throwOnError: stryMutAct_9fa48("3945") ? false : (stryCov_9fa48("3945"), true)
        }));
        const parsed = await parseJsonBody(request, createRouteInputSchema, path);
        if (stryMutAct_9fa48("3947") ? false : stryMutAct_9fa48("3946") ? true : (stryCov_9fa48("3946", "3947"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("3949") ? false : stryMutAct_9fa48("3948") ? true : (stryCov_9fa48("3948", "3949"), backendMode(session))) {
          if (stryMutAct_9fa48("3950")) {
            {}
          } else {
            stryCov_9fa48("3950");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3951") ? "" : (stryCov_9fa48("3951"), "/routes"), stryMutAct_9fa48("3952") ? "" : (stryCov_9fa48("3952"), "route:manage"), stryMutAct_9fa48("3953") ? {} : (stryCov_9fa48("3953"), {
              method: stryMutAct_9fa48("3954") ? "" : (stryCov_9fa48("3954"), "POST"),
              headers: stryMutAct_9fa48("3955") ? {} : (stryCov_9fa48("3955"), {
                "content-type": stryMutAct_9fa48("3956") ? "" : (stryCov_9fa48("3956"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = routeFixtures.find(stryMutAct_9fa48("3957") ? () => undefined : (stryCov_9fa48("3957"), candidate => stryMutAct_9fa48("3960") ? candidate.code.toLowerCase() !== parsed.data.code.toLowerCase() : stryMutAct_9fa48("3959") ? false : stryMutAct_9fa48("3958") ? true : (stryCov_9fa48("3958", "3959", "3960"), (stryMutAct_9fa48("3961") ? candidate.code.toUpperCase() : (stryCov_9fa48("3961"), candidate.code.toLowerCase())) === (stryMutAct_9fa48("3962") ? parsed.data.code.toUpperCase() : (stryCov_9fa48("3962"), parsed.data.code.toLowerCase())))));
        if (stryMutAct_9fa48("3964") ? false : stryMutAct_9fa48("3963") ? true : (stryCov_9fa48("3963", "3964"), existing)) {
          if (stryMutAct_9fa48("3965")) {
            {}
          } else {
            stryCov_9fa48("3965");
            return errorResponse(409, stryMutAct_9fa48("3966") ? `` : (stryCov_9fa48("3966"), `Ya existe un recorrido con el código ${parsed.data.code}.`), path);
          }
        }
        const created: Route = stryMutAct_9fa48("3967") ? {} : (stryCov_9fa48("3967"), {
          id: stryMutAct_9fa48("3968") ? `` : (stryCov_9fa48("3968"), `route-${Date.now()}`),
          code: parsed.data.code,
          name: parsed.data.name,
          active: stryMutAct_9fa48("3969") ? false : (stryCov_9fa48("3969"), true),
          stops: stryMutAct_9fa48("3970") ? ["Stryker was here"] : (stryCov_9fa48("3970"), []) // Nace sin paradas
        });
        if (stryMutAct_9fa48("3971")) {
          ;
        } else {
          stryCov_9fa48("3971");
          addRouteFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("3972") ? {} : (stryCov_9fa48("3972"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3973")) {
        {}
      } else {
        stryCov_9fa48("3973");
        if (stryMutAct_9fa48("3975") ? false : stryMutAct_9fa48("3974") ? true : (stryCov_9fa48("3974", "3975"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("3976")) {
            {}
          } else {
            stryCov_9fa48("3976");
            recordTelemetryEvent(stryMutAct_9fa48("3978") ? {} : (stryCov_9fa48("3978"), {
              name: stryMutAct_9fa48("3979") ? "" : (stryCov_9fa48("3979"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("3980") ? "" : (stryCov_9fa48("3980"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("3982") ? false : stryMutAct_9fa48("3981") ? true : (stryCov_9fa48("3981", "3982"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("3983")) {
            {}
          } else {
            stryCov_9fa48("3983");
            recordTelemetryEvent(stryMutAct_9fa48("3985") ? {} : (stryCov_9fa48("3985"), {
              name: stryMutAct_9fa48("3986") ? "" : (stryCov_9fa48("3986"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("3988") ? false : stryMutAct_9fa48("3987") ? true : (stryCov_9fa48("3987", "3988"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("3989")) {
            {}
          } else {
            stryCov_9fa48("3989");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("3990") ? "" : (stryCov_9fa48("3990"), "No se pudo crear el recorrido."));
      }
    }
  }
}