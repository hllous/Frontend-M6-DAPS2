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
import { serviceFrequencyResponseFixture, addServiceFrequencyFixture, filterServiceFrequencyFixtures, paginateServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyCreateInputSchema, serviceFrequencyShiftSchema, type ServiceFrequencyQuery } from "@/lib/service-frequencies";
import { serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function parseQuery(url: URL): ServiceFrequencyQuery {
  if (stryMutAct_9fa48("4217")) {
    {}
  } else {
    stryCov_9fa48("4217");
    const shift = serviceFrequencyShiftSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("4218") ? "" : (stryCov_9fa48("4218"), "shift")));
    const weekday = Number(url.searchParams.get(stryMutAct_9fa48("4219") ? "" : (stryCov_9fa48("4219"), "weekday")));
    return stryMutAct_9fa48("4220") ? {} : (stryCov_9fa48("4220"), {
      serviceTypeId: stryMutAct_9fa48("4221") ? url.searchParams.get("serviceTypeId") && undefined : (stryCov_9fa48("4221"), url.searchParams.get(stryMutAct_9fa48("4222") ? "" : (stryCov_9fa48("4222"), "serviceTypeId")) ?? undefined),
      routeId: stryMutAct_9fa48("4223") ? url.searchParams.get("routeId") && undefined : (stryCov_9fa48("4223"), url.searchParams.get(stryMutAct_9fa48("4224") ? "" : (stryCov_9fa48("4224"), "routeId")) ?? undefined),
      shift: shift.success ? shift.data : undefined,
      weekday: (stryMutAct_9fa48("4227") ? Number.isInteger(weekday) && weekday >= 1 || weekday <= 7 : stryMutAct_9fa48("4226") ? false : stryMutAct_9fa48("4225") ? true : (stryCov_9fa48("4225", "4226", "4227"), (stryMutAct_9fa48("4229") ? Number.isInteger(weekday) || weekday >= 1 : stryMutAct_9fa48("4228") ? true : (stryCov_9fa48("4228", "4229"), Number.isInteger(weekday) && (stryMutAct_9fa48("4232") ? weekday < 1 : stryMutAct_9fa48("4231") ? weekday > 1 : stryMutAct_9fa48("4230") ? true : (stryCov_9fa48("4230", "4231", "4232"), weekday >= 1)))) && (stryMutAct_9fa48("4235") ? weekday > 7 : stryMutAct_9fa48("4234") ? weekday < 7 : stryMutAct_9fa48("4233") ? true : (stryCov_9fa48("4233", "4234", "4235"), weekday <= 7)))) ? weekday : undefined,
      validOn: stryMutAct_9fa48("4236") ? url.searchParams.get("validOn") && undefined : (stryCov_9fa48("4236"), url.searchParams.get(stryMutAct_9fa48("4237") ? "" : (stryCov_9fa48("4237"), "validOn")) ?? undefined),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("4238")) {
    {}
  } else {
    stryCov_9fa48("4238");
    return authorize(request, stryMutAct_9fa48("4239") ? {} : (stryCov_9fa48("4239"), {
      office: stryMutAct_9fa48("4240") ? false : (stryCov_9fa48("4240"), true),
      officeMessage: stryMutAct_9fa48("4241") ? "" : (stryCov_9fa48("4241"), "Solo Oficina puede administrar frecuencias de servicio."),
      capability: stryMutAct_9fa48("4242") ? "" : (stryCov_9fa48("4242"), "serviceFrequency:manage"),
      throwOnError: stryMutAct_9fa48("4243") ? false : (stryCov_9fa48("4243"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("4244")) {
    {}
  } else {
    stryCov_9fa48("4244");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4245")) {
        {}
      } else {
        stryCov_9fa48("4245");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        if (stryMutAct_9fa48("4247") ? false : stryMutAct_9fa48("4246") ? true : (stryCov_9fa48("4246", "4247"), backendMode(session))) {
          if (stryMutAct_9fa48("4248")) {
            {}
          } else {
            stryCov_9fa48("4248");
            const response = await fetchBackend(request, stryMutAct_9fa48("4249") ? `` : (stryCov_9fa48("4249"), `/service-frequencies${backendQuery(query, stryMutAct_9fa48("4250") ? [] : (stryCov_9fa48("4250"), [stryMutAct_9fa48("4251") ? "" : (stryCov_9fa48("4251"), "serviceTypeId"), stryMutAct_9fa48("4252") ? "" : (stryCov_9fa48("4252"), "routeId"), stryMutAct_9fa48("4253") ? "" : (stryCov_9fa48("4253"), "shift"), stryMutAct_9fa48("4254") ? "" : (stryCov_9fa48("4254"), "weekday"), stryMutAct_9fa48("4255") ? "" : (stryCov_9fa48("4255"), "validOn"), stryMutAct_9fa48("4256") ? "" : (stryCov_9fa48("4256"), "page"), stryMutAct_9fa48("4257") ? "" : (stryCov_9fa48("4257"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateServiceFrequencyFixtures(filterServiceFrequencyFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4258")) {
        {}
      } else {
        stryCov_9fa48("4258");
        return handleRouteError(error, path, stryMutAct_9fa48("4259") ? "" : (stryCov_9fa48("4259"), "No se pudieron cargar las frecuencias de servicio."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("4260")) {
    {}
  } else {
    stryCov_9fa48("4260");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4261")) {
        {}
      } else {
        stryCov_9fa48("4261");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, serviceFrequencyCreateInputSchema, path);
        if (stryMutAct_9fa48("4263") ? false : stryMutAct_9fa48("4262") ? true : (stryCov_9fa48("4262", "4263"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4265") ? false : stryMutAct_9fa48("4264") ? true : (stryCov_9fa48("4264", "4265"), backendMode(session))) {
          if (stryMutAct_9fa48("4266")) {
            {}
          } else {
            stryCov_9fa48("4266");
            const response = await fetchBackend(request, stryMutAct_9fa48("4267") ? "" : (stryCov_9fa48("4267"), "/service-frequencies"), stryMutAct_9fa48("4268") ? "" : (stryCov_9fa48("4268"), "serviceFrequency:manage"), stryMutAct_9fa48("4269") ? {} : (stryCov_9fa48("4269"), {
              method: stryMutAct_9fa48("4270") ? "" : (stryCov_9fa48("4270"), "POST"),
              headers: stryMutAct_9fa48("4271") ? {} : (stryCov_9fa48("4271"), {
                "content-type": stryMutAct_9fa48("4272") ? "" : (stryCov_9fa48("4272"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const serviceType = serviceTypeFixtures.find(stryMutAct_9fa48("4273") ? () => undefined : (stryCov_9fa48("4273"), item => stryMutAct_9fa48("4276") ? item.id !== parsed.data.serviceTypeId : stryMutAct_9fa48("4275") ? false : stryMutAct_9fa48("4274") ? true : (stryCov_9fa48("4274", "4275", "4276"), item.id === parsed.data.serviceTypeId)));
        if (stryMutAct_9fa48("4279") ? !serviceType && serviceType.mode !== "ROUTE" : stryMutAct_9fa48("4278") ? false : stryMutAct_9fa48("4277") ? true : (stryCov_9fa48("4277", "4278", "4279"), (stryMutAct_9fa48("4280") ? serviceType : (stryCov_9fa48("4280"), !serviceType)) || (stryMutAct_9fa48("4282") ? serviceType.mode === "ROUTE" : stryMutAct_9fa48("4281") ? false : (stryCov_9fa48("4281", "4282"), serviceType.mode !== (stryMutAct_9fa48("4283") ? "" : (stryCov_9fa48("4283"), "ROUTE")))))) return errorResponse(400, stryMutAct_9fa48("4284") ? "" : (stryCov_9fa48("4284"), "El tipo de servicio debe ser de modo ROUTE."), path);
        const created = stryMutAct_9fa48("4285") ? {} : (stryCov_9fa48("4285"), {
          id: stryMutAct_9fa48("4286") ? `` : (stryCov_9fa48("4286"), `freq-${Date.now()}`),
          ...parsed.data,
          validTo: stryMutAct_9fa48("4287") ? parsed.data.validTo && null : (stryCov_9fa48("4287"), parsed.data.validTo ?? null)
        });
        if (stryMutAct_9fa48("4288")) {
          ;
        } else {
          stryCov_9fa48("4288");
          addServiceFrequencyFixture(created);
        }
        return NextResponse.json(serviceFrequencyResponseFixture(created), stryMutAct_9fa48("4289") ? {} : (stryCov_9fa48("4289"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4290")) {
        {}
      } else {
        stryCov_9fa48("4290");
        if (stryMutAct_9fa48("4292") ? false : stryMutAct_9fa48("4291") ? true : (stryCov_9fa48("4291", "4292"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4293") ? "" : (stryCov_9fa48("4293"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4295") ? false : stryMutAct_9fa48("4294") ? true : (stryCov_9fa48("4294", "4295"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("4297") ? false : stryMutAct_9fa48("4296") ? true : (stryCov_9fa48("4296", "4297"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4298") ? "" : (stryCov_9fa48("4298"), "No se pudo crear la frecuencia de servicio."));
      }
    }
  }
}