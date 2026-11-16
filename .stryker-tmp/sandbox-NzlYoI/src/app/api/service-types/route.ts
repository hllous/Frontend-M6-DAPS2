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
import { addServiceTypeFixture, filterServiceTypeFixtures, paginateServiceTypeFixtures } from "@/lib/service-type-fixtures";
import { serviceTypeCategorySchema, serviceTypeCreateInputSchema, serviceTypeModeSchema, type ServiceTypeQuery } from "@/lib/service-types";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseQuery(url: URL): ServiceTypeQuery {
  if (stryMutAct_9fa48("4374")) {
    {}
  } else {
    stryCov_9fa48("4374");
    const activeParam = url.searchParams.get(stryMutAct_9fa48("4375") ? "" : (stryCov_9fa48("4375"), "active"));
    const category = serviceTypeCategorySchema.safeParse(url.searchParams.get(stryMutAct_9fa48("4376") ? "" : (stryCov_9fa48("4376"), "category")));
    const mode = serviceTypeModeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("4377") ? "" : (stryCov_9fa48("4377"), "mode")));
    return stryMutAct_9fa48("4378") ? {} : (stryCov_9fa48("4378"), {
      active: (stryMutAct_9fa48("4381") ? activeParam !== null : stryMutAct_9fa48("4380") ? false : stryMutAct_9fa48("4379") ? true : (stryCov_9fa48("4379", "4380", "4381"), activeParam === null)) ? undefined : stryMutAct_9fa48("4384") ? activeParam !== "true" : stryMutAct_9fa48("4383") ? false : stryMutAct_9fa48("4382") ? true : (stryCov_9fa48("4382", "4383", "4384"), activeParam === (stryMutAct_9fa48("4385") ? "" : (stryCov_9fa48("4385"), "true"))),
      category: category.success ? category.data : undefined,
      mode: mode.success ? mode.data : undefined,
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("4386")) {
    {}
  } else {
    stryCov_9fa48("4386");
    return authorize(request, stryMutAct_9fa48("4387") ? {} : (stryCov_9fa48("4387"), {
      office: stryMutAct_9fa48("4388") ? false : (stryCov_9fa48("4388"), true),
      officeMessage: stryMutAct_9fa48("4389") ? "" : (stryCov_9fa48("4389"), "Solo Oficina puede administrar tipos de servicio."),
      capability: stryMutAct_9fa48("4390") ? "" : (stryCov_9fa48("4390"), "serviceType:manage"),
      throwOnError: stryMutAct_9fa48("4391") ? false : (stryCov_9fa48("4391"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("4392")) {
    {}
  } else {
    stryCov_9fa48("4392");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4393")) {
        {}
      } else {
        stryCov_9fa48("4393");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        if (stryMutAct_9fa48("4395") ? false : stryMutAct_9fa48("4394") ? true : (stryCov_9fa48("4394", "4395"), backendMode(session))) {
          if (stryMutAct_9fa48("4396")) {
            {}
          } else {
            stryCov_9fa48("4396");
            const response = await fetchBackend(request, stryMutAct_9fa48("4397") ? `` : (stryCov_9fa48("4397"), `/service-types${backendQuery(query, stryMutAct_9fa48("4398") ? [] : (stryCov_9fa48("4398"), [stryMutAct_9fa48("4399") ? "" : (stryCov_9fa48("4399"), "active"), stryMutAct_9fa48("4400") ? "" : (stryCov_9fa48("4400"), "category"), stryMutAct_9fa48("4401") ? "" : (stryCov_9fa48("4401"), "mode"), stryMutAct_9fa48("4402") ? "" : (stryCov_9fa48("4402"), "search"), stryMutAct_9fa48("4403") ? "" : (stryCov_9fa48("4403"), "page"), stryMutAct_9fa48("4404") ? "" : (stryCov_9fa48("4404"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateServiceTypeFixtures(filterServiceTypeFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4405")) {
        {}
      } else {
        stryCov_9fa48("4405");
        if (stryMutAct_9fa48("4407") ? false : stryMutAct_9fa48("4406") ? true : (stryCov_9fa48("4406", "4407"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4408") ? "" : (stryCov_9fa48("4408"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4410") ? false : stryMutAct_9fa48("4409") ? true : (stryCov_9fa48("4409", "4410"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4411") ? "" : (stryCov_9fa48("4411"), "No se pudieron cargar los tipos de servicio."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("4412")) {
    {}
  } else {
    stryCov_9fa48("4412");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4413")) {
        {}
      } else {
        stryCov_9fa48("4413");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, serviceTypeCreateInputSchema, path);
        if (stryMutAct_9fa48("4415") ? false : stryMutAct_9fa48("4414") ? true : (stryCov_9fa48("4414", "4415"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4417") ? false : stryMutAct_9fa48("4416") ? true : (stryCov_9fa48("4416", "4417"), backendMode(session))) {
          if (stryMutAct_9fa48("4418")) {
            {}
          } else {
            stryCov_9fa48("4418");
            const response = await fetchBackend(request, stryMutAct_9fa48("4419") ? "" : (stryCov_9fa48("4419"), "/service-types"), stryMutAct_9fa48("4420") ? "" : (stryCov_9fa48("4420"), "serviceType:manage"), stryMutAct_9fa48("4421") ? {} : (stryCov_9fa48("4421"), {
              method: stryMutAct_9fa48("4422") ? "" : (stryCov_9fa48("4422"), "POST"),
              headers: stryMutAct_9fa48("4423") ? {} : (stryCov_9fa48("4423"), {
                "content-type": stryMutAct_9fa48("4424") ? "" : (stryCov_9fa48("4424"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const created = stryMutAct_9fa48("4425") ? {} : (stryCov_9fa48("4425"), {
          id: stryMutAct_9fa48("4426") ? `` : (stryCov_9fa48("4426"), `st-${Date.now()}`),
          ...parsed.data,
          active: stryMutAct_9fa48("4427") ? false : (stryCov_9fa48("4427"), true)
        });
        if (stryMutAct_9fa48("4428")) {
          ;
        } else {
          stryCov_9fa48("4428");
          addServiceTypeFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("4429") ? {} : (stryCov_9fa48("4429"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4430")) {
        {}
      } else {
        stryCov_9fa48("4430");
        if (stryMutAct_9fa48("4432") ? false : stryMutAct_9fa48("4431") ? true : (stryCov_9fa48("4431", "4432"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4433") ? "" : (stryCov_9fa48("4433"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4435") ? false : stryMutAct_9fa48("4434") ? true : (stryCov_9fa48("4434", "4435"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("4437") ? false : stryMutAct_9fa48("4436") ? true : (stryCov_9fa48("4436", "4437"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4438") ? "" : (stryCov_9fa48("4438"), "No se pudo crear el tipo de servicio."));
      }
    }
  }
}