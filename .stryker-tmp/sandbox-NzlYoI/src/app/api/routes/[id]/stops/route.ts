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
import { getRouteFixture, setRouteStopsFixture } from "@/lib/routes-fixtures";
import { setRouteStopsInputSchema } from "@/lib/routes";
import { zoneFixtures } from "@/lib/zones-fixtures";
export async function PUT(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4149")) {
    {}
  } else {
    stryCov_9fa48("4149");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4150")) {
        {}
      } else {
        stryCov_9fa48("4150");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("4152") ? {} : (stryCov_9fa48("4152"), {
          office: stryMutAct_9fa48("4153") ? false : (stryCov_9fa48("4153"), true),
          officeMessage: stryMutAct_9fa48("4154") ? "" : (stryCov_9fa48("4154"), "Solo el rol de Oficina puede editar la secuencia de paradas de recorridos."),
          capability: stryMutAct_9fa48("4155") ? "" : (stryCov_9fa48("4155"), "route:manage"),
          throwOnError: stryMutAct_9fa48("4156") ? false : (stryCov_9fa48("4156"), true)
        }));
        const parsed = await parseJsonBody(request, setRouteStopsInputSchema, path);
        if (stryMutAct_9fa48("4158") ? false : stryMutAct_9fa48("4157") ? true : (stryCov_9fa48("4157", "4158"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4160") ? false : stryMutAct_9fa48("4159") ? true : (stryCov_9fa48("4159", "4160"), backendMode(session))) {
          if (stryMutAct_9fa48("4161")) {
            {}
          } else {
            stryCov_9fa48("4161");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4162") ? `` : (stryCov_9fa48("4162"), `/routes/${pathId(id)}/stops`), stryMutAct_9fa48("4163") ? "" : (stryCov_9fa48("4163"), "route:manage"), stryMutAct_9fa48("4164") ? {} : (stryCov_9fa48("4164"), {
              method: stryMutAct_9fa48("4165") ? "" : (stryCov_9fa48("4165"), "PUT"),
              headers: stryMutAct_9fa48("4166") ? {} : (stryCov_9fa48("4166"), {
                "content-type": stryMutAct_9fa48("4167") ? "" : (stryCov_9fa48("4167"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existingRoute = getRouteFixture(id);
        if (stryMutAct_9fa48("4170") ? false : stryMutAct_9fa48("4169") ? true : stryMutAct_9fa48("4168") ? existingRoute : (stryCov_9fa48("4168", "4169", "4170"), !existingRoute)) {
          if (stryMutAct_9fa48("4171")) {
            {}
          } else {
            stryCov_9fa48("4171");
            return errorResponse(404, stryMutAct_9fa48("4172") ? "" : (stryCov_9fa48("4172"), "Recorrido no encontrado."), path);
          }
        }

        // Check if referenced zones exist
        const zoneIds = parsed.data.stops.map(stryMutAct_9fa48("4173") ? () => undefined : (stryCov_9fa48("4173"), s => s.zoneId));
        if (stryMutAct_9fa48("4177") ? zoneIds.length <= 0 : stryMutAct_9fa48("4176") ? zoneIds.length >= 0 : stryMutAct_9fa48("4175") ? false : stryMutAct_9fa48("4174") ? true : (stryCov_9fa48("4174", "4175", "4176", "4177"), zoneIds.length > 0)) {
          if (stryMutAct_9fa48("4178")) {
            {}
          } else {
            stryCov_9fa48("4178");
            const missingZones = stryMutAct_9fa48("4179") ? zoneIds : (stryCov_9fa48("4179"), zoneIds.filter(stryMutAct_9fa48("4180") ? () => undefined : (stryCov_9fa48("4180"), zid => stryMutAct_9fa48("4181") ? zoneFixtures.some(z => z.id === zid) : (stryCov_9fa48("4181"), !(stryMutAct_9fa48("4182") ? zoneFixtures.every(z => z.id === zid) : (stryCov_9fa48("4182"), zoneFixtures.some(stryMutAct_9fa48("4183") ? () => undefined : (stryCov_9fa48("4183"), z => stryMutAct_9fa48("4186") ? z.id !== zid : stryMutAct_9fa48("4185") ? false : stryMutAct_9fa48("4184") ? true : (stryCov_9fa48("4184", "4185", "4186"), z.id === zid)))))))));
            if (stryMutAct_9fa48("4190") ? missingZones.length <= 0 : stryMutAct_9fa48("4189") ? missingZones.length >= 0 : stryMutAct_9fa48("4188") ? false : stryMutAct_9fa48("4187") ? true : (stryCov_9fa48("4187", "4188", "4189", "4190"), missingZones.length > 0)) {
              if (stryMutAct_9fa48("4191")) {
                {}
              } else {
                stryCov_9fa48("4191");
                return errorResponse(404, stryMutAct_9fa48("4192") ? `` : (stryCov_9fa48("4192"), `Zonas no encontradas: ${missingZones.join(stryMutAct_9fa48("4193") ? "" : (stryCov_9fa48("4193"), ", "))}`), path);
              }
            }
          }
        }
        const updated = setRouteStopsFixture(id, parsed.data.stops);
        if (stryMutAct_9fa48("4196") ? false : stryMutAct_9fa48("4195") ? true : stryMutAct_9fa48("4194") ? updated : (stryCov_9fa48("4194", "4195", "4196"), !updated)) {
          if (stryMutAct_9fa48("4197")) {
            {}
          } else {
            stryCov_9fa48("4197");
            return errorResponse(404, stryMutAct_9fa48("4198") ? "" : (stryCov_9fa48("4198"), "Recorrido no encontrado."), path);
          }
        }
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4199")) {
        {}
      } else {
        stryCov_9fa48("4199");
        if (stryMutAct_9fa48("4201") ? false : stryMutAct_9fa48("4200") ? true : (stryCov_9fa48("4200", "4201"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4202")) {
            {}
          } else {
            stryCov_9fa48("4202");
            recordTelemetryEvent(stryMutAct_9fa48("4204") ? {} : (stryCov_9fa48("4204"), {
              name: stryMutAct_9fa48("4205") ? "" : (stryCov_9fa48("4205"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4206") ? "" : (stryCov_9fa48("4206"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("4208") ? false : stryMutAct_9fa48("4207") ? true : (stryCov_9fa48("4207", "4208"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("4209")) {
            {}
          } else {
            stryCov_9fa48("4209");
            recordTelemetryEvent(stryMutAct_9fa48("4211") ? {} : (stryCov_9fa48("4211"), {
              name: stryMutAct_9fa48("4212") ? "" : (stryCov_9fa48("4212"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("4214") ? false : stryMutAct_9fa48("4213") ? true : (stryCov_9fa48("4213", "4214"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("4215")) {
            {}
          } else {
            stryCov_9fa48("4215");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("4216") ? "" : (stryCov_9fa48("4216"), "No se pudo actualizar la secuencia de paradas."));
      }
    }
  }
}