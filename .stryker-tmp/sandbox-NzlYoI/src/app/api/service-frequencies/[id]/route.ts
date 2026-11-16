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
import { serviceFrequencyResponseFixture, closeServiceFrequencyFixture, serviceFrequencyFixtures, updateServiceFrequencyFixture } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyUpdateInputSchema } from "@/lib/service-frequencies";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4299")) {
    {}
  } else {
    stryCov_9fa48("4299");
    return (await context.params).id;
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("4300")) {
    {}
  } else {
    stryCov_9fa48("4300");
    return authorize(request, stryMutAct_9fa48("4301") ? {} : (stryCov_9fa48("4301"), {
      office: stryMutAct_9fa48("4302") ? false : (stryCov_9fa48("4302"), true),
      officeMessage: stryMutAct_9fa48("4303") ? "" : (stryCov_9fa48("4303"), "Solo Oficina puede administrar frecuencias de servicio."),
      capability: stryMutAct_9fa48("4304") ? "" : (stryCov_9fa48("4304"), "serviceFrequency:manage"),
      throwOnError: stryMutAct_9fa48("4305") ? false : (stryCov_9fa48("4305"), true)
    })).session;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4306")) {
    {}
  } else {
    stryCov_9fa48("4306");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4307")) {
        {}
      } else {
        stryCov_9fa48("4307");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("4309") ? false : stryMutAct_9fa48("4308") ? true : (stryCov_9fa48("4308", "4309"), backendMode(session))) {
          if (stryMutAct_9fa48("4310")) {
            {}
          } else {
            stryCov_9fa48("4310");
            const response = await fetchBackend(request, stryMutAct_9fa48("4311") ? `` : (stryCov_9fa48("4311"), `/service-frequencies/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const item = serviceFrequencyFixtures.find(stryMutAct_9fa48("4312") ? () => undefined : (stryCov_9fa48("4312"), candidate => stryMutAct_9fa48("4315") ? candidate.id !== id : stryMutAct_9fa48("4314") ? false : stryMutAct_9fa48("4313") ? true : (stryCov_9fa48("4313", "4314", "4315"), candidate.id === id)));
        return item ? NextResponse.json(serviceFrequencyResponseFixture(item)) : errorResponse(404, stryMutAct_9fa48("4316") ? "" : (stryCov_9fa48("4316"), "Frecuencia no encontrada."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4317")) {
        {}
      } else {
        stryCov_9fa48("4317");
        if (stryMutAct_9fa48("4319") ? false : stryMutAct_9fa48("4318") ? true : (stryCov_9fa48("4318", "4319"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4320") ? "" : (stryCov_9fa48("4320"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4322") ? false : stryMutAct_9fa48("4321") ? true : (stryCov_9fa48("4321", "4322"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4323") ? "" : (stryCov_9fa48("4323"), "No se pudo cargar la frecuencia de servicio."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4324")) {
    {}
  } else {
    stryCov_9fa48("4324");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4325")) {
        {}
      } else {
        stryCov_9fa48("4325");
        const session = requireOfficeCapability(request);
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, serviceFrequencyUpdateInputSchema, path);
        if (stryMutAct_9fa48("4327") ? false : stryMutAct_9fa48("4326") ? true : (stryCov_9fa48("4326", "4327"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4329") ? false : stryMutAct_9fa48("4328") ? true : (stryCov_9fa48("4328", "4329"), backendMode(session))) {
          if (stryMutAct_9fa48("4330")) {
            {}
          } else {
            stryCov_9fa48("4330");
            const response = await fetchBackend(request, stryMutAct_9fa48("4331") ? `` : (stryCov_9fa48("4331"), `/service-frequencies/${pathId(id)}`), stryMutAct_9fa48("4332") ? "" : (stryCov_9fa48("4332"), "serviceFrequency:manage"), stryMutAct_9fa48("4333") ? {} : (stryCov_9fa48("4333"), {
              method: stryMutAct_9fa48("4334") ? "" : (stryCov_9fa48("4334"), "PATCH"),
              headers: stryMutAct_9fa48("4335") ? {} : (stryCov_9fa48("4335"), {
                "content-type": stryMutAct_9fa48("4336") ? "" : (stryCov_9fa48("4336"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateServiceFrequencyFixture(id, parsed.data);
        return updated ? NextResponse.json(serviceFrequencyResponseFixture(updated)) : errorResponse(404, stryMutAct_9fa48("4337") ? "" : (stryCov_9fa48("4337"), "Frecuencia no encontrada."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4338")) {
        {}
      } else {
        stryCov_9fa48("4338");
        if (stryMutAct_9fa48("4340") ? false : stryMutAct_9fa48("4339") ? true : (stryCov_9fa48("4339", "4340"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4341") ? "" : (stryCov_9fa48("4341"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4343") ? false : stryMutAct_9fa48("4342") ? true : (stryCov_9fa48("4342", "4343"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("4345") ? false : stryMutAct_9fa48("4344") ? true : (stryCov_9fa48("4344", "4345"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4346") ? "" : (stryCov_9fa48("4346"), "No se pudo actualizar la frecuencia de servicio."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4347")) {
    {}
  } else {
    stryCov_9fa48("4347");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4348")) {
        {}
      } else {
        stryCov_9fa48("4348");
        const session = requireOfficeCapability(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("4350") ? false : stryMutAct_9fa48("4349") ? true : (stryCov_9fa48("4349", "4350"), backendMode(session))) {
          if (stryMutAct_9fa48("4351")) {
            {}
          } else {
            stryCov_9fa48("4351");
            const response = await fetchBackend(request, stryMutAct_9fa48("4352") ? `` : (stryCov_9fa48("4352"), `/service-frequencies/${pathId(id)}`), stryMutAct_9fa48("4353") ? "" : (stryCov_9fa48("4353"), "serviceFrequency:manage"), stryMutAct_9fa48("4354") ? {} : (stryCov_9fa48("4354"), {
              method: stryMutAct_9fa48("4355") ? "" : (stryCov_9fa48("4355"), "DELETE")
            }));
            return forwardResponse(response);
          }
        }
        const updated = closeServiceFrequencyFixture(id);
        return updated ? NextResponse.json(serviceFrequencyResponseFixture(updated)) : errorResponse(404, stryMutAct_9fa48("4356") ? "" : (stryCov_9fa48("4356"), "Frecuencia no encontrada."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4357")) {
        {}
      } else {
        stryCov_9fa48("4357");
        if (stryMutAct_9fa48("4359") ? false : stryMutAct_9fa48("4358") ? true : (stryCov_9fa48("4358", "4359"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4360")) {
            {}
          } else {
            stryCov_9fa48("4360");
            recordTelemetryEvent(stryMutAct_9fa48("4362") ? {} : (stryCov_9fa48("4362"), {
              name: stryMutAct_9fa48("4363") ? "" : (stryCov_9fa48("4363"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4364") ? "" : (stryCov_9fa48("4364"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("4366") ? false : stryMutAct_9fa48("4365") ? true : (stryCov_9fa48("4365", "4366"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("4367")) {
            {}
          } else {
            stryCov_9fa48("4367");
            recordTelemetryEvent(stryMutAct_9fa48("4369") ? {} : (stryCov_9fa48("4369"), {
              name: stryMutAct_9fa48("4370") ? "" : (stryCov_9fa48("4370"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("4372") ? false : stryMutAct_9fa48("4371") ? true : (stryCov_9fa48("4371", "4372"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4373") ? "" : (stryCov_9fa48("4373"), "No se pudo cerrar la vigencia de la frecuencia."));
      }
    }
  }
}