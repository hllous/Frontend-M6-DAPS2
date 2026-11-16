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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { greenPointFixtures, updateGreenPointFixture } from "@/lib/green-point-fixtures";
import { greenPointUpdateInputSchema } from "@/lib/green-points";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2793")) {
    {}
  } else {
    stryCov_9fa48("2793");
    return (await context.params).id;
  }
}
function requireOffice(request: Request) {
  if (stryMutAct_9fa48("2794")) {
    {}
  } else {
    stryCov_9fa48("2794");
    return authorize(request, stryMutAct_9fa48("2795") ? {} : (stryCov_9fa48("2795"), {
      office: stryMutAct_9fa48("2796") ? false : (stryCov_9fa48("2796"), true),
      officeMessage: stryMutAct_9fa48("2797") ? "" : (stryCov_9fa48("2797"), "Solo Oficina puede administrar puntos verdes."),
      capability: stryMutAct_9fa48("2798") ? "" : (stryCov_9fa48("2798"), "greenPoint:manage"),
      throwOnError: stryMutAct_9fa48("2799") ? false : (stryCov_9fa48("2799"), true)
    })).session;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2800")) {
    {}
  } else {
    stryCov_9fa48("2800");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2801")) {
        {}
      } else {
        stryCov_9fa48("2801");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("2803") ? false : stryMutAct_9fa48("2802") ? true : (stryCov_9fa48("2802", "2803"), backendMode(session))) {
          if (stryMutAct_9fa48("2804")) {
            {}
          } else {
            stryCov_9fa48("2804");
            const response = await fetchBackend(request, stryMutAct_9fa48("2805") ? `` : (stryCov_9fa48("2805"), `/green-points/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const item = greenPointFixtures.find(stryMutAct_9fa48("2806") ? () => undefined : (stryCov_9fa48("2806"), candidate => stryMutAct_9fa48("2809") ? candidate.id !== id : stryMutAct_9fa48("2808") ? false : stryMutAct_9fa48("2807") ? true : (stryCov_9fa48("2807", "2808", "2809"), candidate.id === id)));
        return item ? NextResponse.json(item) : errorResponse(404, stryMutAct_9fa48("2810") ? `` : (stryCov_9fa48("2810"), `Punto verde ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2811")) {
        {}
      } else {
        stryCov_9fa48("2811");
        if (stryMutAct_9fa48("2813") ? false : stryMutAct_9fa48("2812") ? true : (stryCov_9fa48("2812", "2813"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("2814") ? "" : (stryCov_9fa48("2814"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2816") ? false : stryMutAct_9fa48("2815") ? true : (stryCov_9fa48("2815", "2816"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("2817") ? "" : (stryCov_9fa48("2817"), "No se pudo cargar el punto verde."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2818")) {
    {}
  } else {
    stryCov_9fa48("2818");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2819")) {
        {}
      } else {
        stryCov_9fa48("2819");
        const session = requireOffice(request);
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, greenPointUpdateInputSchema, path);
        if (stryMutAct_9fa48("2821") ? false : stryMutAct_9fa48("2820") ? true : (stryCov_9fa48("2820", "2821"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("2823") ? false : stryMutAct_9fa48("2822") ? true : (stryCov_9fa48("2822", "2823"), backendMode(session))) {
          if (stryMutAct_9fa48("2824")) {
            {}
          } else {
            stryCov_9fa48("2824");
            const response = await fetchBackend(request, stryMutAct_9fa48("2825") ? `` : (stryCov_9fa48("2825"), `/green-points/${pathId(id)}`), stryMutAct_9fa48("2826") ? "" : (stryCov_9fa48("2826"), "greenPoint:manage"), stryMutAct_9fa48("2827") ? {} : (stryCov_9fa48("2827"), {
              method: stryMutAct_9fa48("2828") ? "" : (stryCov_9fa48("2828"), "PATCH"),
              headers: stryMutAct_9fa48("2829") ? {} : (stryCov_9fa48("2829"), {
                "content-type": stryMutAct_9fa48("2830") ? "" : (stryCov_9fa48("2830"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateGreenPointFixture(id, parsed.data);
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("2831") ? `` : (stryCov_9fa48("2831"), `Punto verde ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2832")) {
        {}
      } else {
        stryCov_9fa48("2832");
        if (stryMutAct_9fa48("2834") ? false : stryMutAct_9fa48("2833") ? true : (stryCov_9fa48("2833", "2834"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("2835") ? "" : (stryCov_9fa48("2835"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2837") ? false : stryMutAct_9fa48("2836") ? true : (stryCov_9fa48("2836", "2837"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("2839") ? false : stryMutAct_9fa48("2838") ? true : (stryCov_9fa48("2838", "2839"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("2840") ? "" : (stryCov_9fa48("2840"), "No se pudo actualizar el punto verde."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("2841")) {
    {}
  } else {
    stryCov_9fa48("2841");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2842")) {
        {}
      } else {
        stryCov_9fa48("2842");
        const session = requireOffice(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("2844") ? false : stryMutAct_9fa48("2843") ? true : (stryCov_9fa48("2843", "2844"), backendMode(session))) {
          if (stryMutAct_9fa48("2845")) {
            {}
          } else {
            stryCov_9fa48("2845");
            const response = await fetchBackend(request, stryMutAct_9fa48("2846") ? `` : (stryCov_9fa48("2846"), `/green-points/${pathId(id)}`), stryMutAct_9fa48("2847") ? "" : (stryCov_9fa48("2847"), "greenPoint:manage"), stryMutAct_9fa48("2848") ? {} : (stryCov_9fa48("2848"), {
              method: stryMutAct_9fa48("2849") ? "" : (stryCov_9fa48("2849"), "DELETE")
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateGreenPointFixture(id, stryMutAct_9fa48("2850") ? {} : (stryCov_9fa48("2850"), {
          active: stryMutAct_9fa48("2851") ? true : (stryCov_9fa48("2851"), false)
        }));
        return updated ? new NextResponse(null, stryMutAct_9fa48("2852") ? {} : (stryCov_9fa48("2852"), {
          status: 204
        })) : errorResponse(404, stryMutAct_9fa48("2853") ? `` : (stryCov_9fa48("2853"), `Punto verde ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("2854")) {
        {}
      } else {
        stryCov_9fa48("2854");
        if (stryMutAct_9fa48("2856") ? false : stryMutAct_9fa48("2855") ? true : (stryCov_9fa48("2855", "2856"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("2857") ? "" : (stryCov_9fa48("2857"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2859") ? false : stryMutAct_9fa48("2858") ? true : (stryCov_9fa48("2858", "2859"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("2861") ? false : stryMutAct_9fa48("2860") ? true : (stryCov_9fa48("2860", "2861"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("2862") ? "" : (stryCov_9fa48("2862"), "No se pudo dar de baja el punto verde."));
      }
    }
  }
}