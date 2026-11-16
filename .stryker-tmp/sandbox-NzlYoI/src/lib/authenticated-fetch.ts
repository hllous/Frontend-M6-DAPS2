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
import { broadcastLogout } from "./session-client";
import { recordTelemetryEvent } from "./telemetry";

/** Un 403 con `code: ROLE_REQUIRED` avisa que los roles de la sesión pueden estar desactualizados. */
export const ROLES_STALE_EVENT = stryMutAct_9fa48("6881") ? "" : (stryCov_9fa48("6881"), "m6:roles-stale");

/** Código estable del cuerpo de un 403 (`ROLE_REQUIRED`, `NOT_ASSIGNED`, ...); sin código es un 403 de `sub_type` u otro. */
export async function readForbiddenCode(response: Response): Promise<string | undefined> {
  if (stryMutAct_9fa48("6882")) {
    {}
  } else {
    stryCov_9fa48("6882");
    const body = (await response.clone().json().catch(() => undefined)) as {
      code?: unknown;
    } | undefined;
    return (stryMutAct_9fa48("6885") ? typeof body?.code !== "string" : stryMutAct_9fa48("6884") ? false : stryMutAct_9fa48("6883") ? true : (stryCov_9fa48("6883", "6884", "6885"), typeof (stryMutAct_9fa48("6886") ? body.code : (stryCov_9fa48("6886"), body?.code)) === (stryMutAct_9fa48("6887") ? "" : (stryCov_9fa48("6887"), "string")))) ? body.code : undefined;
  }
}

/** Mensaje claro por `code` de un 403 del backend. */
const FORBIDDEN_MESSAGES: Record<string, string> = stryMutAct_9fa48("6888") ? {} : (stryCov_9fa48("6888"), {
  ROLE_REQUIRED: stryMutAct_9fa48("6889") ? "" : (stryCov_9fa48("6889"), "No tiene el rol necesario para realizar esta acción en Ambiente. Solicite acceso a un administrador."),
  NOT_ASSIGNED: stryMutAct_9fa48("6890") ? "" : (stryCov_9fa48("6890"), "Este servicio no está asignado a su cuadrilla: solo la cuadrilla asignada puede operarlo.")
});
export class NetworkFailureError extends Error {
  constructor(options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("6891")) {
      {}
    } else {
      stryCov_9fa48("6891");
      super(stryMutAct_9fa48("6892") ? "" : (stryCov_9fa48("6892"), "No se pudo conectar con el servidor. Verifique su conexión."), options);
      this.name = stryMutAct_9fa48("6893") ? "" : (stryCov_9fa48("6893"), "NetworkFailureError");
    }
  }
}
export async function authenticatedFetch(input: string, init?: RequestInit): Promise<Response> {
  if (stryMutAct_9fa48("6894")) {
    {}
  } else {
    stryCov_9fa48("6894");
    let response: Response;
    try {
      if (stryMutAct_9fa48("6895")) {
        {}
      } else {
        stryCov_9fa48("6895");
        response = await fetch(input, stryMutAct_9fa48("6896") ? {} : (stryCov_9fa48("6896"), {
          cache: stryMutAct_9fa48("6897") ? "" : (stryCov_9fa48("6897"), "no-store"),
          ...init
        }));
      }
    } catch (cause) {
      if (stryMutAct_9fa48("6898")) {
        {}
      } else {
        stryCov_9fa48("6898");
        throw new NetworkFailureError(stryMutAct_9fa48("6900") ? {} : (stryCov_9fa48("6900"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("6903") ? response.status !== 401 : stryMutAct_9fa48("6902") ? false : stryMutAct_9fa48("6901") ? true : (stryCov_9fa48("6901", "6902", "6903"), response.status === 401)) {
      if (stryMutAct_9fa48("6904")) {
        {}
      } else {
        stryCov_9fa48("6904");
        recordTelemetryEvent(stryMutAct_9fa48("6906") ? {} : (stryCov_9fa48("6906"), {
          name: stryMutAct_9fa48("6907") ? "" : (stryCov_9fa48("6907"), "auth_session_expired"),
          status: 401
        }));
        await broadcastLogout(stryMutAct_9fa48("6908") ? {} : (stryCov_9fa48("6908"), {
          expired: stryMutAct_9fa48("6909") ? false : (stryCov_9fa48("6909"), true)
        }));
      }
    } else if (stryMutAct_9fa48("6912") ? response.status !== 403 : stryMutAct_9fa48("6911") ? false : stryMutAct_9fa48("6910") ? true : (stryCov_9fa48("6910", "6911", "6912"), response.status === 403)) {
      if (stryMutAct_9fa48("6913")) {
        {}
      } else {
        stryCov_9fa48("6913");
        recordTelemetryEvent(stryMutAct_9fa48("6915") ? {} : (stryCov_9fa48("6915"), {
          name: stryMutAct_9fa48("6916") ? "" : (stryCov_9fa48("6916"), "auth_forbidden"),
          status: 403
        }));
        const code = await readForbiddenCode(response);
        const message = code ? FORBIDDEN_MESSAGES[code] : undefined;
        if (stryMutAct_9fa48("6919") ? code || message : stryMutAct_9fa48("6918") ? false : stryMutAct_9fa48("6917") ? true : (stryCov_9fa48("6917", "6918", "6919"), code && message)) {
          if (stryMutAct_9fa48("6920")) {
            {}
          } else {
            stryCov_9fa48("6920");
            if (stryMutAct_9fa48("6923") ? code === "ROLE_REQUIRED" && input !== "/api/me" || typeof window !== "undefined" : stryMutAct_9fa48("6922") ? false : stryMutAct_9fa48("6921") ? true : (stryCov_9fa48("6921", "6922", "6923"), (stryMutAct_9fa48("6925") ? code === "ROLE_REQUIRED" || input !== "/api/me" : stryMutAct_9fa48("6924") ? true : (stryCov_9fa48("6924", "6925"), (stryMutAct_9fa48("6927") ? code !== "ROLE_REQUIRED" : stryMutAct_9fa48("6926") ? true : (stryCov_9fa48("6926", "6927"), code === (stryMutAct_9fa48("6928") ? "" : (stryCov_9fa48("6928"), "ROLE_REQUIRED")))) && (stryMutAct_9fa48("6930") ? input === "/api/me" : stryMutAct_9fa48("6929") ? true : (stryCov_9fa48("6929", "6930"), input !== (stryMutAct_9fa48("6931") ? "" : (stryCov_9fa48("6931"), "/api/me")))))) && (stryMutAct_9fa48("6933") ? typeof window === "undefined" : stryMutAct_9fa48("6932") ? true : (stryCov_9fa48("6932", "6933"), typeof window !== (stryMutAct_9fa48("6934") ? "" : (stryCov_9fa48("6934"), "undefined")))))) {
              if (stryMutAct_9fa48("6935")) {
                {}
              } else {
                stryCov_9fa48("6935");
                if (stryMutAct_9fa48("6936")) {
                  ;
                } else {
                  stryCov_9fa48("6936");
                  window.dispatchEvent(new Event(ROLES_STALE_EVENT));
                }
              }
            }
            const body = await response.json();
            const headers = new Headers(response.headers);
            headers.delete(stryMutAct_9fa48("6938") ? "" : (stryCov_9fa48("6938"), "content-length"));
            response = new Response(JSON.stringify(stryMutAct_9fa48("6939") ? {} : (stryCov_9fa48("6939"), {
              ...body,
              message
            })), stryMutAct_9fa48("6940") ? {} : (stryCov_9fa48("6940"), {
              status: 403,
              headers
            }));
          }
        }
      }
    }
    return response;
  }
}