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
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { updateVehicleInputSchema } from "@/lib/vehicles";
import { vehicleFixtures } from "@/lib/vehicles-fixtures";
type Context = {
  params: Promise<{
    id: string;
  }>;
};
async function requestContext(request: Request, context: Context) {
  if (stryMutAct_9fa48("6267")) {
    {}
  } else {
    stryCov_9fa48("6267");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    const session = getRequiredSession(request);
    return stryMutAct_9fa48("6268") ? {} : (stryCov_9fa48("6268"), {
      id,
      path,
      session
    });
  }
}
function requireOfficeCapability(session: ReturnType<typeof getRequiredSession>) {
  if (stryMutAct_9fa48("6269")) {
    {}
  } else {
    stryCov_9fa48("6269");
    authorize(session, stryMutAct_9fa48("6271") ? {} : (stryCov_9fa48("6271"), {
      office: stryMutAct_9fa48("6272") ? false : (stryCov_9fa48("6272"), true),
      officeMessage: stryMutAct_9fa48("6273") ? "" : (stryCov_9fa48("6273"), "Solo Oficina puede administrar vehículos."),
      capability: stryMutAct_9fa48("6274") ? "" : (stryCov_9fa48("6274"), "vehicle:manage"),
      throwOnError: stryMutAct_9fa48("6275") ? false : (stryCov_9fa48("6275"), true)
    }));
  }
}
async function forward(request: Request, path: string, capability?: "vehicle:manage", init?: RequestInit) {
  if (stryMutAct_9fa48("6276")) {
    {}
  } else {
    stryCov_9fa48("6276");
    const response = await fetchBackend(request, path, capability, init);
    return forwardResponse(response);
  }
}
export async function GET(request: Request, context: Context) {
  if (stryMutAct_9fa48("6277")) {
    {}
  } else {
    stryCov_9fa48("6277");
    try {
      if (stryMutAct_9fa48("6278")) {
        {}
      } else {
        stryCov_9fa48("6278");
        const {
          id,
          path,
          session
        } = await requestContext(request, context);
        if (stryMutAct_9fa48("6280") ? false : stryMutAct_9fa48("6279") ? true : (stryCov_9fa48("6279", "6280"), backendMode(session))) return forward(request, stryMutAct_9fa48("6281") ? `` : (stryCov_9fa48("6281"), `/vehicles/${pathId(id)}`));
        const vehicle = vehicleFixtures.find(stryMutAct_9fa48("6282") ? () => undefined : (stryCov_9fa48("6282"), item => stryMutAct_9fa48("6285") ? item.id !== id : stryMutAct_9fa48("6284") ? false : stryMutAct_9fa48("6283") ? true : (stryCov_9fa48("6283", "6284", "6285"), item.id === id)));
        return vehicle ? NextResponse.json(vehicle) : errorResponse(404, stryMutAct_9fa48("6286") ? `` : (stryCov_9fa48("6286"), `El vehículo ${id} no existe.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6287")) {
        {}
      } else {
        stryCov_9fa48("6287");
        if (stryMutAct_9fa48("6289") ? false : stryMutAct_9fa48("6288") ? true : (stryCov_9fa48("6288", "6289"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6290")) {
            {}
          } else {
            stryCov_9fa48("6290");
            recordTelemetryEvent(stryMutAct_9fa48("6292") ? {} : (stryCov_9fa48("6292"), {
              name: stryMutAct_9fa48("6293") ? "" : (stryCov_9fa48("6293"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6294") ? "" : (stryCov_9fa48("6294"), "La sesión no está activa."), new URL(request.url).pathname);
          }
        }
        if (stryMutAct_9fa48("6296") ? false : stryMutAct_9fa48("6295") ? true : (stryCov_9fa48("6295", "6296"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, new URL(request.url).pathname);
        return mapSessionError(error, new URL(request.url).pathname, stryMutAct_9fa48("6297") ? "" : (stryCov_9fa48("6297"), "No se pudo cargar el vehículo."));
      }
    }
  }
}
export async function PATCH(request: Request, context: Context) {
  if (stryMutAct_9fa48("6298")) {
    {}
  } else {
    stryCov_9fa48("6298");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6299")) {
        {}
      } else {
        stryCov_9fa48("6299");
        const {
          id,
          session
        } = await requestContext(request, context);
        if (stryMutAct_9fa48("6300")) {
          ;
        } else {
          stryCov_9fa48("6300");
          requireOfficeCapability(session);
        }
        const parsed = await parseJsonBody(request, updateVehicleInputSchema, path);
        if (stryMutAct_9fa48("6302") ? false : stryMutAct_9fa48("6301") ? true : (stryCov_9fa48("6301", "6302"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6303")) {
          ;
        } else {
          stryCov_9fa48("6303");
          requireOfficeCapability(session);
        }
        if (stryMutAct_9fa48("6305") ? false : stryMutAct_9fa48("6304") ? true : (stryCov_9fa48("6304", "6305"), backendMode(session))) return forward(request, stryMutAct_9fa48("6306") ? `` : (stryCov_9fa48("6306"), `/vehicles/${pathId(id)}`), stryMutAct_9fa48("6307") ? "" : (stryCov_9fa48("6307"), "vehicle:manage"), stryMutAct_9fa48("6308") ? {} : (stryCov_9fa48("6308"), {
          method: stryMutAct_9fa48("6309") ? "" : (stryCov_9fa48("6309"), "PATCH"),
          headers: stryMutAct_9fa48("6310") ? {} : (stryCov_9fa48("6310"), {
            "content-type": stryMutAct_9fa48("6311") ? "" : (stryCov_9fa48("6311"), "application/json")
          }),
          body: JSON.stringify(parsed.data)
        }));
        const vehicle = vehicleFixtures.find(stryMutAct_9fa48("6312") ? () => undefined : (stryCov_9fa48("6312"), item => stryMutAct_9fa48("6315") ? item.id !== id : stryMutAct_9fa48("6314") ? false : stryMutAct_9fa48("6313") ? true : (stryCov_9fa48("6313", "6314", "6315"), item.id === id)));
        if (stryMutAct_9fa48("6318") ? false : stryMutAct_9fa48("6317") ? true : stryMutAct_9fa48("6316") ? vehicle : (stryCov_9fa48("6316", "6317", "6318"), !vehicle)) return errorResponse(404, stryMutAct_9fa48("6319") ? `` : (stryCov_9fa48("6319"), `El vehículo ${id} no existe.`), path);
        if (stryMutAct_9fa48("6320")) {
          ;
        } else {
          stryCov_9fa48("6320");
          Object.assign(vehicle, parsed.data);
        }
        return NextResponse.json(vehicle);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6321")) {
        {}
      } else {
        stryCov_9fa48("6321");
        if (stryMutAct_9fa48("6323") ? false : stryMutAct_9fa48("6322") ? true : (stryCov_9fa48("6322", "6323"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6324") ? "" : (stryCov_9fa48("6324"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6326") ? false : stryMutAct_9fa48("6325") ? true : (stryCov_9fa48("6325", "6326"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6328") ? false : stryMutAct_9fa48("6327") ? true : (stryCov_9fa48("6327", "6328"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6329") ? "" : (stryCov_9fa48("6329"), "No se pudo actualizar el vehículo."));
      }
    }
  }
}
export async function DELETE(request: Request, context: Context) {
  if (stryMutAct_9fa48("6330")) {
    {}
  } else {
    stryCov_9fa48("6330");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6331")) {
        {}
      } else {
        stryCov_9fa48("6331");
        const {
          id,
          session
        } = await requestContext(request, context);
        if (stryMutAct_9fa48("6332")) {
          ;
        } else {
          stryCov_9fa48("6332");
          requireOfficeCapability(session);
        }
        if (stryMutAct_9fa48("6334") ? false : stryMutAct_9fa48("6333") ? true : (stryCov_9fa48("6333", "6334"), backendMode(session))) return forward(request, stryMutAct_9fa48("6335") ? `` : (stryCov_9fa48("6335"), `/vehicles/${pathId(id)}`), stryMutAct_9fa48("6336") ? "" : (stryCov_9fa48("6336"), "vehicle:manage"), stryMutAct_9fa48("6337") ? {} : (stryCov_9fa48("6337"), {
          method: stryMutAct_9fa48("6338") ? "" : (stryCov_9fa48("6338"), "DELETE")
        }));
        const vehicle = vehicleFixtures.find(stryMutAct_9fa48("6339") ? () => undefined : (stryCov_9fa48("6339"), item => stryMutAct_9fa48("6342") ? item.id !== id : stryMutAct_9fa48("6341") ? false : stryMutAct_9fa48("6340") ? true : (stryCov_9fa48("6340", "6341", "6342"), item.id === id)));
        if (stryMutAct_9fa48("6345") ? false : stryMutAct_9fa48("6344") ? true : stryMutAct_9fa48("6343") ? vehicle : (stryCov_9fa48("6343", "6344", "6345"), !vehicle)) return errorResponse(404, stryMutAct_9fa48("6346") ? `` : (stryCov_9fa48("6346"), `El vehículo ${id} no existe.`), path);
        vehicle.active = stryMutAct_9fa48("6347") ? true : (stryCov_9fa48("6347"), false);
        return NextResponse.json(vehicle);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6348")) {
        {}
      } else {
        stryCov_9fa48("6348");
        if (stryMutAct_9fa48("6350") ? false : stryMutAct_9fa48("6349") ? true : (stryCov_9fa48("6349", "6350"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6351") ? "" : (stryCov_9fa48("6351"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6353") ? false : stryMutAct_9fa48("6352") ? true : (stryCov_9fa48("6352", "6353"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6355") ? false : stryMutAct_9fa48("6354") ? true : (stryCov_9fa48("6354", "6355"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6356") ? "" : (stryCov_9fa48("6356"), "No se pudo dar de baja el vehículo."));
      }
    }
  }
}