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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getRouteFixture, updateRouteFixture } from "@/lib/routes-fixtures";
import { updateRouteInputSchema } from "@/lib/routes";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4054")) {
    {}
  } else {
    stryCov_9fa48("4054");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4055")) {
        {}
      } else {
        stryCov_9fa48("4055");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("4057") ? false : stryMutAct_9fa48("4056") ? true : (stryCov_9fa48("4056", "4057"), backendMode(session))) {
          if (stryMutAct_9fa48("4058")) {
            {}
          } else {
            stryCov_9fa48("4058");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4059") ? `` : (stryCov_9fa48("4059"), `/routes/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        const route = getRouteFixture(id);
        if (stryMutAct_9fa48("4062") ? false : stryMutAct_9fa48("4061") ? true : stryMutAct_9fa48("4060") ? route : (stryCov_9fa48("4060", "4061", "4062"), !route)) {
          if (stryMutAct_9fa48("4063")) {
            {}
          } else {
            stryCov_9fa48("4063");
            return errorResponse(404, stryMutAct_9fa48("4064") ? "" : (stryCov_9fa48("4064"), "Recorrido no encontrado."), path);
          }
        }
        return NextResponse.json(route);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4065")) {
        {}
      } else {
        stryCov_9fa48("4065");
        return handleRouteError(error, path, stryMutAct_9fa48("4066") ? "" : (stryCov_9fa48("4066"), "No se pudo cargar el recorrido."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4067")) {
    {}
  } else {
    stryCov_9fa48("4067");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4068")) {
        {}
      } else {
        stryCov_9fa48("4068");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("4070") ? {} : (stryCov_9fa48("4070"), {
          office: stryMutAct_9fa48("4071") ? false : (stryCov_9fa48("4071"), true),
          officeMessage: stryMutAct_9fa48("4072") ? "" : (stryCov_9fa48("4072"), "Solo el rol de Oficina puede editar recorridos."),
          capability: stryMutAct_9fa48("4073") ? "" : (stryCov_9fa48("4073"), "route:manage"),
          throwOnError: stryMutAct_9fa48("4074") ? false : (stryCov_9fa48("4074"), true)
        }));
        const parsed = await parseJsonBody(request, updateRouteInputSchema, path);
        if (stryMutAct_9fa48("4076") ? false : stryMutAct_9fa48("4075") ? true : (stryCov_9fa48("4075", "4076"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4078") ? false : stryMutAct_9fa48("4077") ? true : (stryCov_9fa48("4077", "4078"), backendMode(session))) {
          if (stryMutAct_9fa48("4079")) {
            {}
          } else {
            stryCov_9fa48("4079");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4080") ? `` : (stryCov_9fa48("4080"), `/routes/${pathId(id)}`), stryMutAct_9fa48("4081") ? "" : (stryCov_9fa48("4081"), "route:manage"), stryMutAct_9fa48("4082") ? {} : (stryCov_9fa48("4082"), {
              method: stryMutAct_9fa48("4083") ? "" : (stryCov_9fa48("4083"), "PATCH"),
              headers: stryMutAct_9fa48("4084") ? {} : (stryCov_9fa48("4084"), {
                "content-type": stryMutAct_9fa48("4085") ? "" : (stryCov_9fa48("4085"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const updated = updateRouteFixture(id, parsed.data);
        if (stryMutAct_9fa48("4088") ? false : stryMutAct_9fa48("4087") ? true : stryMutAct_9fa48("4086") ? updated : (stryCov_9fa48("4086", "4087", "4088"), !updated)) {
          if (stryMutAct_9fa48("4089")) {
            {}
          } else {
            stryCov_9fa48("4089");
            return errorResponse(404, stryMutAct_9fa48("4090") ? "" : (stryCov_9fa48("4090"), "Recorrido no encontrado."), path);
          }
        }
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4091")) {
        {}
      } else {
        stryCov_9fa48("4091");
        if (stryMutAct_9fa48("4093") ? false : stryMutAct_9fa48("4092") ? true : (stryCov_9fa48("4092", "4093"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4094")) {
            {}
          } else {
            stryCov_9fa48("4094");
            recordTelemetryEvent(stryMutAct_9fa48("4096") ? {} : (stryCov_9fa48("4096"), {
              name: stryMutAct_9fa48("4097") ? "" : (stryCov_9fa48("4097"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4098") ? "" : (stryCov_9fa48("4098"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("4100") ? false : stryMutAct_9fa48("4099") ? true : (stryCov_9fa48("4099", "4100"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("4101")) {
            {}
          } else {
            stryCov_9fa48("4101");
            recordTelemetryEvent(stryMutAct_9fa48("4103") ? {} : (stryCov_9fa48("4103"), {
              name: stryMutAct_9fa48("4104") ? "" : (stryCov_9fa48("4104"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("4106") ? false : stryMutAct_9fa48("4105") ? true : (stryCov_9fa48("4105", "4106"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("4107")) {
            {}
          } else {
            stryCov_9fa48("4107");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("4108") ? "" : (stryCov_9fa48("4108"), "No se pudo editar el recorrido."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4109")) {
    {}
  } else {
    stryCov_9fa48("4109");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4110")) {
        {}
      } else {
        stryCov_9fa48("4110");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("4112") ? {} : (stryCov_9fa48("4112"), {
          office: stryMutAct_9fa48("4113") ? false : (stryCov_9fa48("4113"), true),
          officeMessage: stryMutAct_9fa48("4114") ? "" : (stryCov_9fa48("4114"), "Solo el rol de Oficina puede desactivar recorridos."),
          capability: stryMutAct_9fa48("4115") ? "" : (stryCov_9fa48("4115"), "route:manage"),
          throwOnError: stryMutAct_9fa48("4116") ? false : (stryCov_9fa48("4116"), true)
        }));
        if (stryMutAct_9fa48("4118") ? false : stryMutAct_9fa48("4117") ? true : (stryCov_9fa48("4117", "4118"), backendMode(session))) {
          if (stryMutAct_9fa48("4119")) {
            {}
          } else {
            stryCov_9fa48("4119");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4120") ? `` : (stryCov_9fa48("4120"), `/routes/${pathId(id)}`), stryMutAct_9fa48("4121") ? "" : (stryCov_9fa48("4121"), "route:manage"), stryMutAct_9fa48("4122") ? {} : (stryCov_9fa48("4122"), {
              method: stryMutAct_9fa48("4123") ? "" : (stryCov_9fa48("4123"), "DELETE")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const updated = updateRouteFixture(id, stryMutAct_9fa48("4124") ? {} : (stryCov_9fa48("4124"), {
          active: stryMutAct_9fa48("4125") ? true : (stryCov_9fa48("4125"), false)
        }));
        if (stryMutAct_9fa48("4128") ? false : stryMutAct_9fa48("4127") ? true : stryMutAct_9fa48("4126") ? updated : (stryCov_9fa48("4126", "4127", "4128"), !updated)) {
          if (stryMutAct_9fa48("4129")) {
            {}
          } else {
            stryCov_9fa48("4129");
            return errorResponse(404, stryMutAct_9fa48("4130") ? "" : (stryCov_9fa48("4130"), "Recorrido no encontrado."), path);
          }
        }
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4131")) {
        {}
      } else {
        stryCov_9fa48("4131");
        if (stryMutAct_9fa48("4133") ? false : stryMutAct_9fa48("4132") ? true : (stryCov_9fa48("4132", "4133"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4134")) {
            {}
          } else {
            stryCov_9fa48("4134");
            recordTelemetryEvent(stryMutAct_9fa48("4136") ? {} : (stryCov_9fa48("4136"), {
              name: stryMutAct_9fa48("4137") ? "" : (stryCov_9fa48("4137"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4138") ? "" : (stryCov_9fa48("4138"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("4140") ? false : stryMutAct_9fa48("4139") ? true : (stryCov_9fa48("4139", "4140"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("4141")) {
            {}
          } else {
            stryCov_9fa48("4141");
            recordTelemetryEvent(stryMutAct_9fa48("4143") ? {} : (stryCov_9fa48("4143"), {
              name: stryMutAct_9fa48("4144") ? "" : (stryCov_9fa48("4144"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("4146") ? false : stryMutAct_9fa48("4145") ? true : (stryCov_9fa48("4145", "4146"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("4147")) {
            {}
          } else {
            stryCov_9fa48("4147");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("4148") ? "" : (stryCov_9fa48("4148"), "No se pudo desactivar el recorrido."));
      }
    }
  }
}