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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { neighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { assignNeighborhoodsFixture, getZoneFixture } from "@/lib/zones-fixtures";
import { assignNeighborhoodsInputSchema } from "@/lib/zones";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6433")) {
    {}
  } else {
    stryCov_9fa48("6433");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6434")) {
        {}
      } else {
        stryCov_9fa48("6434");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6436") ? {} : (stryCov_9fa48("6436"), {
          office: stryMutAct_9fa48("6437") ? false : (stryCov_9fa48("6437"), true),
          officeMessage: stryMutAct_9fa48("6438") ? "" : (stryCov_9fa48("6438"), "Solo el rol de Oficina puede asignar barrios a una zona operativa."),
          capability: stryMutAct_9fa48("6439") ? "" : (stryCov_9fa48("6439"), "zone:manage"),
          throwOnError: stryMutAct_9fa48("6440") ? false : (stryCov_9fa48("6440"), true)
        }));
        const parsed = await parseJsonBody(request, assignNeighborhoodsInputSchema, path);
        if (stryMutAct_9fa48("6442") ? false : stryMutAct_9fa48("6441") ? true : (stryCov_9fa48("6441", "6442"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6444") ? false : stryMutAct_9fa48("6443") ? true : (stryCov_9fa48("6443", "6444"), backendMode(session))) {
          if (stryMutAct_9fa48("6445")) {
            {}
          } else {
            stryCov_9fa48("6445");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6446") ? `` : (stryCov_9fa48("6446"), `/zones/${pathId(id)}/neighborhoods`), stryMutAct_9fa48("6447") ? "" : (stryCov_9fa48("6447"), "zone:manage"), stryMutAct_9fa48("6448") ? {} : (stryCov_9fa48("6448"), {
              method: stryMutAct_9fa48("6449") ? "" : (stryCov_9fa48("6449"), "POST"),
              headers: stryMutAct_9fa48("6450") ? {} : (stryCov_9fa48("6450"), {
                "content-type": stryMutAct_9fa48("6451") ? "" : (stryCov_9fa48("6451"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }

        // Como el backend: el id tiene que ser el UUID de un barrio del catálogo de M9 (no el `codigo`).
        if (stryMutAct_9fa48("6454") ? parsed.data.neighborhoodIds.every(neighborhoodId => !neighborhoodFixtures.some(candidate => candidate.id === neighborhoodId)) : stryMutAct_9fa48("6453") ? false : stryMutAct_9fa48("6452") ? true : (stryCov_9fa48("6452", "6453", "6454"), parsed.data.neighborhoodIds.some(stryMutAct_9fa48("6455") ? () => undefined : (stryCov_9fa48("6455"), neighborhoodId => stryMutAct_9fa48("6456") ? neighborhoodFixtures.some(candidate => candidate.id === neighborhoodId) : (stryCov_9fa48("6456"), !(stryMutAct_9fa48("6457") ? neighborhoodFixtures.every(candidate => candidate.id === neighborhoodId) : (stryCov_9fa48("6457"), neighborhoodFixtures.some(stryMutAct_9fa48("6458") ? () => undefined : (stryCov_9fa48("6458"), candidate => stryMutAct_9fa48("6461") ? candidate.id !== neighborhoodId : stryMutAct_9fa48("6460") ? false : stryMutAct_9fa48("6459") ? true : (stryCov_9fa48("6459", "6460", "6461"), candidate.id === neighborhoodId)))))))))) {
          if (stryMutAct_9fa48("6462")) {
            {}
          } else {
            stryCov_9fa48("6462");
            return errorResponse(400, stryMutAct_9fa48("6463") ? "" : (stryCov_9fa48("6463"), "Algún barrio no figura en el catálogo de barrios de la ciudad."), path);
          }
        }
        if (stryMutAct_9fa48("6466") ? false : stryMutAct_9fa48("6465") ? true : stryMutAct_9fa48("6464") ? getZoneFixture(id) : (stryCov_9fa48("6464", "6465", "6466"), !getZoneFixture(id))) {
          if (stryMutAct_9fa48("6467")) {
            {}
          } else {
            stryCov_9fa48("6467");
            return errorResponse(404, stryMutAct_9fa48("6468") ? "" : (stryCov_9fa48("6468"), "Zona operativa no encontrada."), path);
          }
        }
        const updated = assignNeighborhoodsFixture(id, parsed.data.neighborhoodIds);
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6469")) {
        {}
      } else {
        stryCov_9fa48("6469");
        if (stryMutAct_9fa48("6471") ? false : stryMutAct_9fa48("6470") ? true : (stryCov_9fa48("6470", "6471"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6472")) {
            {}
          } else {
            stryCov_9fa48("6472");
            recordTelemetryEvent(stryMutAct_9fa48("6474") ? {} : (stryCov_9fa48("6474"), {
              name: stryMutAct_9fa48("6475") ? "" : (stryCov_9fa48("6475"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6476") ? "" : (stryCov_9fa48("6476"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("6478") ? false : stryMutAct_9fa48("6477") ? true : (stryCov_9fa48("6477", "6478"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("6479")) {
            {}
          } else {
            stryCov_9fa48("6479");
            recordTelemetryEvent(stryMutAct_9fa48("6481") ? {} : (stryCov_9fa48("6481"), {
              name: stryMutAct_9fa48("6482") ? "" : (stryCov_9fa48("6482"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("6484") ? false : stryMutAct_9fa48("6483") ? true : (stryCov_9fa48("6483", "6484"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("6485")) {
            {}
          } else {
            stryCov_9fa48("6485");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("6486") ? "" : (stryCov_9fa48("6486"), "No se pudieron asignar los barrios a la zona operativa."));
      }
    }
  }
}