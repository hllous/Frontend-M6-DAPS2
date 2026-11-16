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
import { backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { greenSpaceFixtures } from "@/lib/green-space-fixtures";
import { updateGreenSpaceInputSchema } from "@/lib/green-spaces";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
async function greenSpaceId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2923")) {
    {}
  } else {
    stryCov_9fa48("2923");
    return (await context.params).id;
  }
}
function isOffice(request: Request) {
  if (stryMutAct_9fa48("2924")) {
    {}
  } else {
    stryCov_9fa48("2924");
    const session = getRequiredSession(request);
    return stryMutAct_9fa48("2927") ? getScenario(session).actor.kind !== "OFFICE" : stryMutAct_9fa48("2926") ? false : stryMutAct_9fa48("2925") ? true : (stryCov_9fa48("2925", "2926", "2927"), getScenario(session).actor.kind === (stryMutAct_9fa48("2928") ? "" : (stryCov_9fa48("2928"), "OFFICE")));
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2929")) {
    {}
  } else {
    stryCov_9fa48("2929");
    const id = await greenSpaceId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2930")) {
        {}
      } else {
        stryCov_9fa48("2930");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("2932") ? false : stryMutAct_9fa48("2931") ? true : (stryCov_9fa48("2931", "2932"), backendMode(session))) {
          if (stryMutAct_9fa48("2933")) {
            {}
          } else {
            stryCov_9fa48("2933");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2934") ? `` : (stryCov_9fa48("2934"), `/green-spaces/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        const greenSpace = greenSpaceFixtures.find(stryMutAct_9fa48("2935") ? () => undefined : (stryCov_9fa48("2935"), item => stryMutAct_9fa48("2938") ? item.id !== id : stryMutAct_9fa48("2937") ? false : stryMutAct_9fa48("2936") ? true : (stryCov_9fa48("2936", "2937", "2938"), item.id === id)));
        return greenSpace ? NextResponse.json(greenSpace) : errorResponse(404, stryMutAct_9fa48("2939") ? "" : (stryCov_9fa48("2939"), "Espacio verde no encontrado."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2940")) {
        {}
      } else {
        stryCov_9fa48("2940");
        return handleRouteError(error, path, stryMutAct_9fa48("2941") ? "" : (stryCov_9fa48("2941"), "No se pudo cargar el espacio verde."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2942")) {
    {}
  } else {
    stryCov_9fa48("2942");
    const id = await greenSpaceId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2943")) {
        {}
      } else {
        stryCov_9fa48("2943");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("2946") ? false : stryMutAct_9fa48("2945") ? true : stryMutAct_9fa48("2944") ? isOffice(request) : (stryCov_9fa48("2944", "2945", "2946"), !isOffice(request))) return errorResponse(403, stryMutAct_9fa48("2947") ? "" : (stryCov_9fa48("2947"), "Solo Oficina puede gestionar espacios verdes."), path);
        const parsed = updateGreenSpaceInputSchema.safeParse(await request.json().catch(() => undefined));
        if (stryMutAct_9fa48("2950") ? false : stryMutAct_9fa48("2949") ? true : stryMutAct_9fa48("2948") ? parsed.success : (stryCov_9fa48("2948", "2949", "2950"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("2951") ? () => undefined : (stryCov_9fa48("2951"), issue => issue.message)).join(stryMutAct_9fa48("2952") ? "" : (stryCov_9fa48("2952"), " ")), path);
        if (stryMutAct_9fa48("2954") ? false : stryMutAct_9fa48("2953") ? true : (stryCov_9fa48("2953", "2954"), backendMode(session))) {
          if (stryMutAct_9fa48("2955")) {
            {}
          } else {
            stryCov_9fa48("2955");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2956") ? `` : (stryCov_9fa48("2956"), `/green-spaces/${pathId(id)}`), undefined, stryMutAct_9fa48("2957") ? {} : (stryCov_9fa48("2957"), {
              method: stryMutAct_9fa48("2958") ? "" : (stryCov_9fa48("2958"), "PATCH"),
              headers: stryMutAct_9fa48("2959") ? {} : (stryCov_9fa48("2959"), {
                "content-type": stryMutAct_9fa48("2960") ? "" : (stryCov_9fa48("2960"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const greenSpace = greenSpaceFixtures.find(stryMutAct_9fa48("2961") ? () => undefined : (stryCov_9fa48("2961"), item => stryMutAct_9fa48("2964") ? item.id !== id : stryMutAct_9fa48("2963") ? false : stryMutAct_9fa48("2962") ? true : (stryCov_9fa48("2962", "2963", "2964"), item.id === id)));
        if (stryMutAct_9fa48("2967") ? false : stryMutAct_9fa48("2966") ? true : stryMutAct_9fa48("2965") ? greenSpace : (stryCov_9fa48("2965", "2966", "2967"), !greenSpace)) return errorResponse(404, stryMutAct_9fa48("2968") ? "" : (stryCov_9fa48("2968"), "Espacio verde no encontrado."), path);
        if (stryMutAct_9fa48("2969")) {
          ;
        } else {
          stryCov_9fa48("2969");
          Object.assign(greenSpace, parsed.data);
        }
        return NextResponse.json(greenSpace);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2970")) {
        {}
      } else {
        stryCov_9fa48("2970");
        return handleRouteError(error, path, stryMutAct_9fa48("2971") ? "" : (stryCov_9fa48("2971"), "No se pudo actualizar el espacio verde."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2972")) {
    {}
  } else {
    stryCov_9fa48("2972");
    const id = await greenSpaceId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2973")) {
        {}
      } else {
        stryCov_9fa48("2973");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("2976") ? false : stryMutAct_9fa48("2975") ? true : stryMutAct_9fa48("2974") ? isOffice(request) : (stryCov_9fa48("2974", "2975", "2976"), !isOffice(request))) return errorResponse(403, stryMutAct_9fa48("2977") ? "" : (stryCov_9fa48("2977"), "Solo Oficina puede gestionar espacios verdes."), path);
        if (stryMutAct_9fa48("2979") ? false : stryMutAct_9fa48("2978") ? true : (stryCov_9fa48("2978", "2979"), backendMode(session))) {
          if (stryMutAct_9fa48("2980")) {
            {}
          } else {
            stryCov_9fa48("2980");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2981") ? `` : (stryCov_9fa48("2981"), `/green-spaces/${pathId(id)}`), undefined, stryMutAct_9fa48("2982") ? {} : (stryCov_9fa48("2982"), {
              method: stryMutAct_9fa48("2983") ? "" : (stryCov_9fa48("2983"), "DELETE")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const greenSpace = greenSpaceFixtures.find(stryMutAct_9fa48("2984") ? () => undefined : (stryCov_9fa48("2984"), item => stryMutAct_9fa48("2987") ? item.id !== id : stryMutAct_9fa48("2986") ? false : stryMutAct_9fa48("2985") ? true : (stryCov_9fa48("2985", "2986", "2987"), item.id === id)));
        if (stryMutAct_9fa48("2990") ? false : stryMutAct_9fa48("2989") ? true : stryMutAct_9fa48("2988") ? greenSpace : (stryCov_9fa48("2988", "2989", "2990"), !greenSpace)) return errorResponse(404, stryMutAct_9fa48("2991") ? "" : (stryCov_9fa48("2991"), "Espacio verde no encontrado."), path);
        greenSpace.active = stryMutAct_9fa48("2992") ? true : (stryCov_9fa48("2992"), false);
        return NextResponse.json(greenSpace);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2993")) {
        {}
      } else {
        stryCov_9fa48("2993");
        return handleRouteError(error, path, stryMutAct_9fa48("2994") ? "" : (stryCov_9fa48("2994"), "No se pudo dar de baja el espacio verde."));
      }
    }
  }
}