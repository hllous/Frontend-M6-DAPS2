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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getZoneFixture, removeNeighborhoodFixture } from "@/lib/zones-fixtures";
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
    neighborhoodId: string;
  }>;
}) {
  if (stryMutAct_9fa48("6487")) {
    {}
  } else {
    stryCov_9fa48("6487");
    const {
      id,
      neighborhoodId
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6488")) {
        {}
      } else {
        stryCov_9fa48("6488");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6490") ? {} : (stryCov_9fa48("6490"), {
          office: stryMutAct_9fa48("6491") ? false : (stryCov_9fa48("6491"), true),
          officeMessage: stryMutAct_9fa48("6492") ? "" : (stryCov_9fa48("6492"), "Solo el rol de Oficina puede quitar barrios de una zona operativa."),
          capability: stryMutAct_9fa48("6493") ? "" : (stryCov_9fa48("6493"), "zone:manage"),
          throwOnError: stryMutAct_9fa48("6494") ? false : (stryCov_9fa48("6494"), true)
        }));
        if (stryMutAct_9fa48("6496") ? false : stryMutAct_9fa48("6495") ? true : (stryCov_9fa48("6495", "6496"), backendMode(session))) {
          if (stryMutAct_9fa48("6497")) {
            {}
          } else {
            stryCov_9fa48("6497");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6498") ? `` : (stryCov_9fa48("6498"), `/zones/${pathId(id)}/neighborhoods/${pathId(neighborhoodId)}`), stryMutAct_9fa48("6499") ? "" : (stryCov_9fa48("6499"), "zone:manage"), stryMutAct_9fa48("6500") ? {} : (stryCov_9fa48("6500"), {
              method: stryMutAct_9fa48("6501") ? "" : (stryCov_9fa48("6501"), "DELETE")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const zone = getZoneFixture(id);
        if (stryMutAct_9fa48("6504") ? false : stryMutAct_9fa48("6503") ? true : stryMutAct_9fa48("6502") ? zone : (stryCov_9fa48("6502", "6503", "6504"), !zone)) {
          if (stryMutAct_9fa48("6505")) {
            {}
          } else {
            stryCov_9fa48("6505");
            return errorResponse(404, stryMutAct_9fa48("6506") ? "" : (stryCov_9fa48("6506"), "Zona operativa no encontrada."), path);
          }
        }
        if (stryMutAct_9fa48("6509") ? false : stryMutAct_9fa48("6508") ? true : stryMutAct_9fa48("6507") ? zone.neighborhoodIds?.includes(neighborhoodId) : (stryCov_9fa48("6507", "6508", "6509"), !(stryMutAct_9fa48("6510") ? zone.neighborhoodIds.includes(neighborhoodId) : (stryCov_9fa48("6510"), zone.neighborhoodIds?.includes(neighborhoodId))))) {
          if (stryMutAct_9fa48("6511")) {
            {}
          } else {
            stryCov_9fa48("6511");
            return errorResponse(404, stryMutAct_9fa48("6512") ? "" : (stryCov_9fa48("6512"), "El barrio no está asignado a la zona operativa."), path);
          }
        }
        const updated = removeNeighborhoodFixture(id, neighborhoodId);
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6513")) {
        {}
      } else {
        stryCov_9fa48("6513");
        if (stryMutAct_9fa48("6515") ? false : stryMutAct_9fa48("6514") ? true : (stryCov_9fa48("6514", "6515"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6516")) {
            {}
          } else {
            stryCov_9fa48("6516");
            recordTelemetryEvent(stryMutAct_9fa48("6518") ? {} : (stryCov_9fa48("6518"), {
              name: stryMutAct_9fa48("6519") ? "" : (stryCov_9fa48("6519"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6520") ? "" : (stryCov_9fa48("6520"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("6522") ? false : stryMutAct_9fa48("6521") ? true : (stryCov_9fa48("6521", "6522"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("6523")) {
            {}
          } else {
            stryCov_9fa48("6523");
            recordTelemetryEvent(stryMutAct_9fa48("6525") ? {} : (stryCov_9fa48("6525"), {
              name: stryMutAct_9fa48("6526") ? "" : (stryCov_9fa48("6526"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("6528") ? false : stryMutAct_9fa48("6527") ? true : (stryCov_9fa48("6527", "6528"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("6529")) {
            {}
          } else {
            stryCov_9fa48("6529");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("6530") ? "" : (stryCov_9fa48("6530"), "No se pudo quitar el barrio de la zona operativa."));
      }
    }
  }
}