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
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { createVehicleInputSchema, type VehicleQuery, vehicleTypeSchema } from "@/lib/vehicles";
import { addVehicleFixture, filterVehicleFixtures, paginateVehicleFixtures } from "@/lib/vehicles-fixtures";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function parseVehicleQuery(url: URL): VehicleQuery {
  if (stryMutAct_9fa48("6210")) {
    {}
  } else {
    stryCov_9fa48("6210");
    const active = url.searchParams.get(stryMutAct_9fa48("6211") ? "" : (stryCov_9fa48("6211"), "active"));
    const vehicleType = vehicleTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("6212") ? "" : (stryCov_9fa48("6212"), "vehicleType")));
    return stryMutAct_9fa48("6213") ? {} : (stryCov_9fa48("6213"), {
      active: (stryMutAct_9fa48("6216") ? active !== null : stryMutAct_9fa48("6215") ? false : stryMutAct_9fa48("6214") ? true : (stryCov_9fa48("6214", "6215", "6216"), active === null)) ? undefined : stryMutAct_9fa48("6219") ? active !== "true" : stryMutAct_9fa48("6218") ? false : stryMutAct_9fa48("6217") ? true : (stryCov_9fa48("6217", "6218", "6219"), active === (stryMutAct_9fa48("6220") ? "" : (stryCov_9fa48("6220"), "true"))),
      vehicleType: vehicleType.success ? vehicleType.data : undefined,
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("6221")) {
    {}
  } else {
    stryCov_9fa48("6221");
    return authorize(request, stryMutAct_9fa48("6222") ? {} : (stryCov_9fa48("6222"), {
      office: stryMutAct_9fa48("6223") ? false : (stryCov_9fa48("6223"), true),
      officeMessage: stryMutAct_9fa48("6224") ? "" : (stryCov_9fa48("6224"), "Solo Oficina puede administrar vehículos."),
      capability: stryMutAct_9fa48("6225") ? "" : (stryCov_9fa48("6225"), "vehicle:manage"),
      throwOnError: stryMutAct_9fa48("6226") ? false : (stryCov_9fa48("6226"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("6227")) {
    {}
  } else {
    stryCov_9fa48("6227");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6228")) {
        {}
      } else {
        stryCov_9fa48("6228");
        const session = getRequiredSession(request);
        const query = parseVehicleQuery(new URL(request.url));
        if (stryMutAct_9fa48("6230") ? false : stryMutAct_9fa48("6229") ? true : (stryCov_9fa48("6229", "6230"), backendMode(session))) {
          if (stryMutAct_9fa48("6231")) {
            {}
          } else {
            stryCov_9fa48("6231");
            const response = await fetchBackend(request, stryMutAct_9fa48("6232") ? `` : (stryCov_9fa48("6232"), `/vehicles${backendQuery(query, stryMutAct_9fa48("6233") ? [] : (stryCov_9fa48("6233"), [stryMutAct_9fa48("6234") ? "" : (stryCov_9fa48("6234"), "active"), stryMutAct_9fa48("6235") ? "" : (stryCov_9fa48("6235"), "vehicleType"), stryMutAct_9fa48("6236") ? "" : (stryCov_9fa48("6236"), "page"), stryMutAct_9fa48("6237") ? "" : (stryCov_9fa48("6237"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateVehicleFixtures(filterVehicleFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6238")) {
        {}
      } else {
        stryCov_9fa48("6238");
        return handleRouteError(error, path, stryMutAct_9fa48("6239") ? "" : (stryCov_9fa48("6239"), "No se pudieron cargar los vehículos."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("6240")) {
    {}
  } else {
    stryCov_9fa48("6240");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6241")) {
        {}
      } else {
        stryCov_9fa48("6241");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, createVehicleInputSchema, path);
        if (stryMutAct_9fa48("6243") ? false : stryMutAct_9fa48("6242") ? true : (stryCov_9fa48("6242", "6243"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6245") ? false : stryMutAct_9fa48("6244") ? true : (stryCov_9fa48("6244", "6245"), backendMode(session))) {
          if (stryMutAct_9fa48("6246")) {
            {}
          } else {
            stryCov_9fa48("6246");
            const response = await fetchBackend(request, stryMutAct_9fa48("6247") ? "" : (stryCov_9fa48("6247"), "/vehicles"), stryMutAct_9fa48("6248") ? "" : (stryCov_9fa48("6248"), "vehicle:manage"), stryMutAct_9fa48("6249") ? {} : (stryCov_9fa48("6249"), {
              method: stryMutAct_9fa48("6250") ? "" : (stryCov_9fa48("6250"), "POST"),
              headers: stryMutAct_9fa48("6251") ? {} : (stryCov_9fa48("6251"), {
                "content-type": stryMutAct_9fa48("6252") ? "" : (stryCov_9fa48("6252"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const vehicle = stryMutAct_9fa48("6253") ? {} : (stryCov_9fa48("6253"), {
          id: stryMutAct_9fa48("6254") ? `` : (stryCov_9fa48("6254"), `vehicle-${Date.now()}`),
          ...parsed.data,
          active: stryMutAct_9fa48("6255") ? false : (stryCov_9fa48("6255"), true)
        });
        if (stryMutAct_9fa48("6256")) {
          ;
        } else {
          stryCov_9fa48("6256");
          addVehicleFixture(vehicle);
        }
        return NextResponse.json(vehicle, stryMutAct_9fa48("6257") ? {} : (stryCov_9fa48("6257"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6258")) {
        {}
      } else {
        stryCov_9fa48("6258");
        if (stryMutAct_9fa48("6260") ? false : stryMutAct_9fa48("6259") ? true : (stryCov_9fa48("6259", "6260"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6261") ? "" : (stryCov_9fa48("6261"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6263") ? false : stryMutAct_9fa48("6262") ? true : (stryCov_9fa48("6262", "6263"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6265") ? false : stryMutAct_9fa48("6264") ? true : (stryCov_9fa48("6264", "6265"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6266") ? "" : (stryCov_9fa48("6266"), "No se pudo registrar el vehículo."));
      }
    }
  }
}