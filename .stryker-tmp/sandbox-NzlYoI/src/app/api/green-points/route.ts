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
import { addGreenPointFixture, filterGreenPointFixtures, greenPointFixtures, paginateGreenPointFixtures } from "@/lib/green-point-fixtures";
import { greenPointCreateInputSchema, wasteTypeSchema, type GreenPointQuery } from "@/lib/green-points";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseQuery(url: URL): GreenPointQuery {
  if (stryMutAct_9fa48("2713")) {
    {}
  } else {
    stryCov_9fa48("2713");
    const active = url.searchParams.get(stryMutAct_9fa48("2714") ? "" : (stryCov_9fa48("2714"), "active"));
    const wasteType = wasteTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("2715") ? "" : (stryCov_9fa48("2715"), "wasteType")));
    return stryMutAct_9fa48("2716") ? {} : (stryCov_9fa48("2716"), {
      active: (stryMutAct_9fa48("2719") ? active !== null : stryMutAct_9fa48("2718") ? false : stryMutAct_9fa48("2717") ? true : (stryCov_9fa48("2717", "2718", "2719"), active === null)) ? undefined : stryMutAct_9fa48("2722") ? active !== "true" : stryMutAct_9fa48("2721") ? false : stryMutAct_9fa48("2720") ? true : (stryCov_9fa48("2720", "2721", "2722"), active === (stryMutAct_9fa48("2723") ? "" : (stryCov_9fa48("2723"), "true"))),
      zoneId: stryMutAct_9fa48("2724") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("2724"), url.searchParams.get(stryMutAct_9fa48("2725") ? "" : (stryCov_9fa48("2725"), "zoneId")) ?? undefined),
      wasteType: wasteType.success ? wasteType.data : undefined,
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("2726")) {
    {}
  } else {
    stryCov_9fa48("2726");
    return authorize(request, stryMutAct_9fa48("2727") ? {} : (stryCov_9fa48("2727"), {
      office: stryMutAct_9fa48("2728") ? false : (stryCov_9fa48("2728"), true),
      officeMessage: stryMutAct_9fa48("2729") ? "" : (stryCov_9fa48("2729"), "Solo Oficina puede administrar puntos verdes."),
      capability: stryMutAct_9fa48("2730") ? "" : (stryCov_9fa48("2730"), "greenPoint:manage"),
      throwOnError: stryMutAct_9fa48("2731") ? false : (stryCov_9fa48("2731"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("2732")) {
    {}
  } else {
    stryCov_9fa48("2732");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2733")) {
        {}
      } else {
        stryCov_9fa48("2733");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        if (stryMutAct_9fa48("2735") ? false : stryMutAct_9fa48("2734") ? true : (stryCov_9fa48("2734", "2735"), backendMode(session))) {
          if (stryMutAct_9fa48("2736")) {
            {}
          } else {
            stryCov_9fa48("2736");
            const response = await fetchBackend(request, stryMutAct_9fa48("2737") ? `` : (stryCov_9fa48("2737"), `/green-points${backendQuery(query, stryMutAct_9fa48("2738") ? [] : (stryCov_9fa48("2738"), [stryMutAct_9fa48("2739") ? "" : (stryCov_9fa48("2739"), "active"), stryMutAct_9fa48("2740") ? "" : (stryCov_9fa48("2740"), "zoneId"), stryMutAct_9fa48("2741") ? "" : (stryCov_9fa48("2741"), "wasteType"), stryMutAct_9fa48("2742") ? "" : (stryCov_9fa48("2742"), "search"), stryMutAct_9fa48("2743") ? "" : (stryCov_9fa48("2743"), "page"), stryMutAct_9fa48("2744") ? "" : (stryCov_9fa48("2744"), "pageSize")]))}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateGreenPointFixtures(filterGreenPointFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2745")) {
        {}
      } else {
        stryCov_9fa48("2745");
        if (stryMutAct_9fa48("2747") ? false : stryMutAct_9fa48("2746") ? true : (stryCov_9fa48("2746", "2747"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("2748") ? "" : (stryCov_9fa48("2748"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2750") ? false : stryMutAct_9fa48("2749") ? true : (stryCov_9fa48("2749", "2750"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("2751") ? "" : (stryCov_9fa48("2751"), "No se pudieron cargar los puntos verdes."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("2752")) {
    {}
  } else {
    stryCov_9fa48("2752");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2753")) {
        {}
      } else {
        stryCov_9fa48("2753");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, greenPointCreateInputSchema, path);
        if (stryMutAct_9fa48("2755") ? false : stryMutAct_9fa48("2754") ? true : (stryCov_9fa48("2754", "2755"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("2757") ? false : stryMutAct_9fa48("2756") ? true : (stryCov_9fa48("2756", "2757"), backendMode(session))) {
          if (stryMutAct_9fa48("2758")) {
            {}
          } else {
            stryCov_9fa48("2758");
            const response = await fetchBackend(request, stryMutAct_9fa48("2759") ? "" : (stryCov_9fa48("2759"), "/green-points"), stryMutAct_9fa48("2760") ? "" : (stryCov_9fa48("2760"), "greenPoint:manage"), stryMutAct_9fa48("2761") ? {} : (stryCov_9fa48("2761"), {
              method: stryMutAct_9fa48("2762") ? "" : (stryCov_9fa48("2762"), "POST"),
              headers: stryMutAct_9fa48("2763") ? {} : (stryCov_9fa48("2763"), {
                "content-type": stryMutAct_9fa48("2764") ? "" : (stryCov_9fa48("2764"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        if (stryMutAct_9fa48("2767") ? greenPointFixtures.every(item => item.code.toLowerCase() === parsed.data.code.toLowerCase()) : stryMutAct_9fa48("2766") ? false : stryMutAct_9fa48("2765") ? true : (stryCov_9fa48("2765", "2766", "2767"), greenPointFixtures.some(stryMutAct_9fa48("2768") ? () => undefined : (stryCov_9fa48("2768"), item => stryMutAct_9fa48("2771") ? item.code.toLowerCase() !== parsed.data.code.toLowerCase() : stryMutAct_9fa48("2770") ? false : stryMutAct_9fa48("2769") ? true : (stryCov_9fa48("2769", "2770", "2771"), (stryMutAct_9fa48("2772") ? item.code.toUpperCase() : (stryCov_9fa48("2772"), item.code.toLowerCase())) === (stryMutAct_9fa48("2773") ? parsed.data.code.toUpperCase() : (stryCov_9fa48("2773"), parsed.data.code.toLowerCase()))))))) return errorResponse(409, stryMutAct_9fa48("2774") ? `` : (stryCov_9fa48("2774"), `Ya existe un punto verde con el código '${parsed.data.code}'.`), path);
        const created = stryMutAct_9fa48("2775") ? {} : (stryCov_9fa48("2775"), {
          id: stryMutAct_9fa48("2776") ? `` : (stryCov_9fa48("2776"), `green-point-${Date.now()}`),
          ...parsed.data,
          address: stryMutAct_9fa48("2777") ? parsed.data.address && null : (stryCov_9fa48("2777"), parsed.data.address ?? null),
          lat: stryMutAct_9fa48("2778") ? parsed.data.lat && null : (stryCov_9fa48("2778"), parsed.data.lat ?? null),
          lng: stryMutAct_9fa48("2779") ? parsed.data.lng && null : (stryCov_9fa48("2779"), parsed.data.lng ?? null),
          active: stryMutAct_9fa48("2780") ? parsed.data.active && true : (stryCov_9fa48("2780"), parsed.data.active ?? (stryMutAct_9fa48("2781") ? false : (stryCov_9fa48("2781"), true)))
        });
        if (stryMutAct_9fa48("2782")) {
          ;
        } else {
          stryCov_9fa48("2782");
          addGreenPointFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("2783") ? {} : (stryCov_9fa48("2783"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2784")) {
        {}
      } else {
        stryCov_9fa48("2784");
        if (stryMutAct_9fa48("2786") ? false : stryMutAct_9fa48("2785") ? true : (stryCov_9fa48("2785", "2786"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("2787") ? "" : (stryCov_9fa48("2787"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2789") ? false : stryMutAct_9fa48("2788") ? true : (stryCov_9fa48("2788", "2789"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("2791") ? false : stryMutAct_9fa48("2790") ? true : (stryCov_9fa48("2790", "2791"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("2792") ? "" : (stryCov_9fa48("2792"), "No se pudo crear el punto verde."));
      }
    }
  }
}