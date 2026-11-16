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
import { backendMode, backendQuery, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { addGreenSpaceFixture, filterGreenSpaceFixtures, greenSpaceFixtures, paginateGreenSpaceFixtures } from "@/lib/green-space-fixtures";
import { createGreenSpaceInputSchema, greenSpaceTypeSchema, type GreenSpace, type GreenSpaceQuery } from "@/lib/green-spaces";
import { getScenario, type OperationalScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function parseGreenSpaceQuery(url: URL): GreenSpaceQuery {
  if (stryMutAct_9fa48("2863")) {
    {}
  } else {
    stryCov_9fa48("2863");
    const rawSpaceType = url.searchParams.get(stryMutAct_9fa48("2864") ? "" : (stryCov_9fa48("2864"), "spaceType"));
    return stryMutAct_9fa48("2865") ? {} : (stryCov_9fa48("2865"), {
      active: url.searchParams.has(stryMutAct_9fa48("2866") ? "" : (stryCov_9fa48("2866"), "active")) ? stryMutAct_9fa48("2869") ? url.searchParams.get("active") !== "true" : stryMutAct_9fa48("2868") ? false : stryMutAct_9fa48("2867") ? true : (stryCov_9fa48("2867", "2868", "2869"), url.searchParams.get(stryMutAct_9fa48("2870") ? "" : (stryCov_9fa48("2870"), "active")) === (stryMutAct_9fa48("2871") ? "" : (stryCov_9fa48("2871"), "true"))) : undefined,
      spaceType: greenSpaceTypeSchema.safeParse(rawSpaceType).success ? rawSpaceType as GreenSpaceQuery["spaceType"] : undefined,
      zoneId: stryMutAct_9fa48("2872") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("2872"), url.searchParams.get(stryMutAct_9fa48("2873") ? "" : (stryCov_9fa48("2873"), "zoneId")) ?? undefined),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function isOffice(scenario: OperationalScenario) {
  if (stryMutAct_9fa48("2874")) {
    {}
  } else {
    stryCov_9fa48("2874");
    return stryMutAct_9fa48("2877") ? scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("2876") ? false : stryMutAct_9fa48("2875") ? true : (stryCov_9fa48("2875", "2876", "2877"), scenario.actor.kind === (stryMutAct_9fa48("2878") ? "" : (stryCov_9fa48("2878"), "OFFICE")));
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("2879")) {
    {}
  } else {
    stryCov_9fa48("2879");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2880")) {
        {}
      } else {
        stryCov_9fa48("2880");
        const session = getRequiredSession(request);
        const query = parseGreenSpaceQuery(new URL(request.url));
        if (stryMutAct_9fa48("2882") ? false : stryMutAct_9fa48("2881") ? true : (stryCov_9fa48("2881", "2882"), backendMode(session))) {
          if (stryMutAct_9fa48("2883")) {
            {}
          } else {
            stryCov_9fa48("2883");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2884") ? `` : (stryCov_9fa48("2884"), `/green-spaces${backendQuery(query, stryMutAct_9fa48("2885") ? [] : (stryCov_9fa48("2885"), [stryMutAct_9fa48("2886") ? "" : (stryCov_9fa48("2886"), "active"), stryMutAct_9fa48("2887") ? "" : (stryCov_9fa48("2887"), "spaceType"), stryMutAct_9fa48("2888") ? "" : (stryCov_9fa48("2888"), "zoneId"), stryMutAct_9fa48("2889") ? "" : (stryCov_9fa48("2889"), "page"), stryMutAct_9fa48("2890") ? "" : (stryCov_9fa48("2890"), "pageSize")]))}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateGreenSpaceFixtures(filterGreenSpaceFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2891")) {
        {}
      } else {
        stryCov_9fa48("2891");
        return handleRouteError(error, path, stryMutAct_9fa48("2892") ? "" : (stryCov_9fa48("2892"), "No se pudieron cargar los espacios verdes."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("2893")) {
    {}
  } else {
    stryCov_9fa48("2893");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2894")) {
        {}
      } else {
        stryCov_9fa48("2894");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("2897") ? false : stryMutAct_9fa48("2896") ? true : stryMutAct_9fa48("2895") ? isOffice(scenario) : (stryCov_9fa48("2895", "2896", "2897"), !isOffice(scenario))) return errorResponse(403, stryMutAct_9fa48("2898") ? "" : (stryCov_9fa48("2898"), "Solo Oficina puede gestionar espacios verdes."), path);
        const parsed = createGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
        if (stryMutAct_9fa48("2901") ? false : stryMutAct_9fa48("2900") ? true : stryMutAct_9fa48("2899") ? parsed.success : (stryCov_9fa48("2899", "2900", "2901"), !parsed.success)) {
          if (stryMutAct_9fa48("2902")) {
            {}
          } else {
            stryCov_9fa48("2902");
            return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("2903") ? () => undefined : (stryCov_9fa48("2903"), issue => issue.message)).join(stryMutAct_9fa48("2904") ? "" : (stryCov_9fa48("2904"), " ")), path);
          }
        }
        if (stryMutAct_9fa48("2906") ? false : stryMutAct_9fa48("2905") ? true : (stryCov_9fa48("2905", "2906"), backendMode(session))) {
          if (stryMutAct_9fa48("2907")) {
            {}
          } else {
            stryCov_9fa48("2907");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2908") ? "" : (stryCov_9fa48("2908"), "/green-spaces"), undefined, stryMutAct_9fa48("2909") ? {} : (stryCov_9fa48("2909"), {
              method: stryMutAct_9fa48("2910") ? "" : (stryCov_9fa48("2910"), "POST"),
              headers: stryMutAct_9fa48("2911") ? {} : (stryCov_9fa48("2911"), {
                "content-type": stryMutAct_9fa48("2912") ? "" : (stryCov_9fa48("2912"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const greenSpace: GreenSpace = stryMutAct_9fa48("2913") ? {} : (stryCov_9fa48("2913"), {
          id: stryMutAct_9fa48("2914") ? `` : (stryCov_9fa48("2914"), `green-space-108-${stryMutAct_9fa48("2915") ? greenSpaceFixtures.length - 1 : (stryCov_9fa48("2915"), greenSpaceFixtures.length + 1)}`),
          ...parsed.data,
          lat: stryMutAct_9fa48("2916") ? parsed.data.lat && null : (stryCov_9fa48("2916"), parsed.data.lat ?? null),
          lng: stryMutAct_9fa48("2917") ? parsed.data.lng && null : (stryCov_9fa48("2917"), parsed.data.lng ?? null),
          active: stryMutAct_9fa48("2918") ? false : (stryCov_9fa48("2918"), true)
        });
        if (stryMutAct_9fa48("2919")) {
          ;
        } else {
          stryCov_9fa48("2919");
          addGreenSpaceFixture(greenSpace);
        }
        return NextResponse.json(greenSpace, stryMutAct_9fa48("2920") ? {} : (stryCov_9fa48("2920"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("2921")) {
        {}
      } else {
        stryCov_9fa48("2921");
        return handleRouteError(error, path, stryMutAct_9fa48("2922") ? "" : (stryCov_9fa48("2922"), "No se pudo registrar el espacio verde."));
      }
    }
  }
}