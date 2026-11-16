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
import { NextResponse } from "next/server";
import { M1AccountBlockedError, M1CredentialsRejectedError, M1InvalidResponseError, M1LoginTimeoutError, M1ServiceUnavailableError, loginWithM1 } from "@/lib/m1-auth";
import { fetchMeWithToken, sessionFromMe } from "@/lib/me";
import { getSessionMutationRejection } from "@/lib/session-request";
import { getScenario, isScenarioId } from "@/lib/scenarios";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { AUTH_COOKIE_NAME, AuthUnavailableError, BackendUnavailableError, CitizenForbiddenError, InvalidSessionError, createM1Session, createSession, getAuthMode, isDeployedAuthModeMisconfigured, publicSession, SESSION_MARKER_COOKIE_NAME, sessionMarkerCookieOptions, sealSession, sessionCookieOptions } from "@/lib/session";
export const maxDuration = 190;
const MAX_LOGIN_BODY_BYTES = 4_096;
const MAX_CONCURRENT_LOGIN_ATTEMPTS = 5;
let concurrentLoginAttempts = 0;
class LoginBodyTooLargeError extends Error {}
function loginFailure(status: 400 | 401 | 403 | 413 | 415 | 429 | 500 | 502 | 503 | 504, message: string) {
  if (stryMutAct_9fa48("5375")) {
    {}
  } else {
    stryCov_9fa48("5375");
    recordTelemetryEvent(stryMutAct_9fa48("5377") ? {} : (stryCov_9fa48("5377"), {
      name: stryMutAct_9fa48("5378") ? "" : (stryCov_9fa48("5378"), "auth_login_failed"),
      status
    }));
    const response = NextResponse.json(stryMutAct_9fa48("5379") ? {} : (stryCov_9fa48("5379"), {
      message
    }), stryMutAct_9fa48("5380") ? {} : (stryCov_9fa48("5380"), {
      status
    }));
    response.headers.set(stryMutAct_9fa48("5382") ? "" : (stryCov_9fa48("5382"), "cache-control"), stryMutAct_9fa48("5383") ? "" : (stryCov_9fa48("5383"), "no-store"));
    if (stryMutAct_9fa48("5386") ? status !== 429 : stryMutAct_9fa48("5385") ? false : stryMutAct_9fa48("5384") ? true : (stryCov_9fa48("5384", "5385", "5386"), status === 429)) response.headers.set(stryMutAct_9fa48("5388") ? "" : (stryCov_9fa48("5388"), "retry-after"), stryMutAct_9fa48("5389") ? "" : (stryCov_9fa48("5389"), "5"));
    return response;
  }
}
function isObject(value: unknown): value is Record<string, unknown> {
  if (stryMutAct_9fa48("5390")) {
    {}
  } else {
    stryCov_9fa48("5390");
    return stryMutAct_9fa48("5393") ? typeof value === "object" && value !== null || !Array.isArray(value) : stryMutAct_9fa48("5392") ? false : stryMutAct_9fa48("5391") ? true : (stryCov_9fa48("5391", "5392", "5393"), (stryMutAct_9fa48("5395") ? typeof value === "object" || value !== null : stryMutAct_9fa48("5394") ? true : (stryCov_9fa48("5394", "5395"), (stryMutAct_9fa48("5397") ? typeof value !== "object" : stryMutAct_9fa48("5396") ? true : (stryCov_9fa48("5396", "5397"), typeof value === (stryMutAct_9fa48("5398") ? "" : (stryCov_9fa48("5398"), "object")))) && (stryMutAct_9fa48("5400") ? value === null : stryMutAct_9fa48("5399") ? true : (stryCov_9fa48("5399", "5400"), value !== null)))) && (stryMutAct_9fa48("5401") ? Array.isArray(value) : (stryCov_9fa48("5401"), !Array.isArray(value))));
  }
}
function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  if (stryMutAct_9fa48("5402")) {
    {}
  } else {
    stryCov_9fa48("5402");
    return stryMutAct_9fa48("5405") ? Object.keys(value).length === keys.length || keys.every(key => Object.hasOwn(value, key)) : stryMutAct_9fa48("5404") ? false : stryMutAct_9fa48("5403") ? true : (stryCov_9fa48("5403", "5404", "5405"), (stryMutAct_9fa48("5407") ? Object.keys(value).length !== keys.length : stryMutAct_9fa48("5406") ? true : (stryCov_9fa48("5406", "5407"), Object.keys(value).length === keys.length)) && (stryMutAct_9fa48("5408") ? keys.some(key => Object.hasOwn(value, key)) : (stryCov_9fa48("5408"), keys.every(stryMutAct_9fa48("5409") ? () => undefined : (stryCov_9fa48("5409"), key => Object.hasOwn(value, key))))));
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("5410")) {
    {}
  } else {
    stryCov_9fa48("5410");
    if (stryMutAct_9fa48("5412") ? false : stryMutAct_9fa48("5411") ? true : (stryCov_9fa48("5411", "5412"), isDeployedAuthModeMisconfigured())) {
      if (stryMutAct_9fa48("5413")) {
        {}
      } else {
        stryCov_9fa48("5413");
        console.error(stryMutAct_9fa48("5415") ? "" : (stryCov_9fa48("5415"), "[m6-auth-mode-misconfigured]"), process.env.M6_AUTH_MODE);
        return loginFailure(503, stryMutAct_9fa48("5416") ? "" : (stryCov_9fa48("5416"), "El ingreso no está disponible por una configuración del servidor."));
      }
    }
    const rejection = getSessionMutationRejection(request);
    if (stryMutAct_9fa48("5418") ? false : stryMutAct_9fa48("5417") ? true : (stryCov_9fa48("5417", "5418"), rejection)) return loginFailure(rejection.status, rejection.message);

    // El cuerpo se lee antes de tomar un cupo: un cliente lento no debe agotar los intentos concurrentes (solo acotan a M1).
    let body: Record<string, unknown>;
    try {
      if (stryMutAct_9fa48("5419")) {
        {}
      } else {
        stryCov_9fa48("5419");
        const value: unknown = await readBoundedJson(request);
        if (stryMutAct_9fa48("5422") ? false : stryMutAct_9fa48("5421") ? true : stryMutAct_9fa48("5420") ? isObject(value) : (stryCov_9fa48("5420", "5421", "5422"), !isObject(value))) throw new Error(stryMutAct_9fa48("5424") ? "" : (stryCov_9fa48("5424"), "invalid body"));
        body = value;
      }
    } catch (error) {
      if (stryMutAct_9fa48("5425")) {
        {}
      } else {
        stryCov_9fa48("5425");
        if (stryMutAct_9fa48("5427") ? false : stryMutAct_9fa48("5426") ? true : (stryCov_9fa48("5426", "5427"), error instanceof LoginBodyTooLargeError)) {
          if (stryMutAct_9fa48("5428")) {
            {}
          } else {
            stryCov_9fa48("5428");
            return loginFailure(413, stryMutAct_9fa48("5429") ? "" : (stryCov_9fa48("5429"), "La solicitud de ingreso supera el tamaño permitido."));
          }
        }
        return loginFailure(400, stryMutAct_9fa48("5430") ? "" : (stryCov_9fa48("5430"), "La solicitud de ingreso no es válida."));
      }
    }
    if (stryMutAct_9fa48("5434") ? concurrentLoginAttempts < MAX_CONCURRENT_LOGIN_ATTEMPTS : stryMutAct_9fa48("5433") ? concurrentLoginAttempts > MAX_CONCURRENT_LOGIN_ATTEMPTS : stryMutAct_9fa48("5432") ? false : stryMutAct_9fa48("5431") ? true : (stryCov_9fa48("5431", "5432", "5433", "5434"), concurrentLoginAttempts >= MAX_CONCURRENT_LOGIN_ATTEMPTS)) {
      if (stryMutAct_9fa48("5435")) {
        {}
      } else {
        stryCov_9fa48("5435");
        return loginFailure(429, stryMutAct_9fa48("5436") ? "" : (stryCov_9fa48("5436"), "Hay demasiados intentos de ingreso en curso. Espere unos segundos e intente nuevamente."));
      }
    }
    stryMutAct_9fa48("5437") ? concurrentLoginAttempts -= 1 : (stryCov_9fa48("5437"), concurrentLoginAttempts += 1);
    try {
      if (stryMutAct_9fa48("5438")) {
        {}
      } else {
        stryCov_9fa48("5438");
        return await handleLoginRequest(request, body);
      }
    } finally {
      if (stryMutAct_9fa48("5439")) {
        {}
      } else {
        stryCov_9fa48("5439");
        stryMutAct_9fa48("5440") ? concurrentLoginAttempts += 1 : (stryCov_9fa48("5440"), concurrentLoginAttempts -= 1);
      }
    }
  }
}
async function handleLoginRequest(request: Request, body: Record<string, unknown>) {
  if (stryMutAct_9fa48("5441")) {
    {}
  } else {
    stryCov_9fa48("5441");
    const mode = getAuthMode();
    if (stryMutAct_9fa48("5444") ? mode !== "real-m1" : stryMutAct_9fa48("5443") ? false : stryMutAct_9fa48("5442") ? true : (stryCov_9fa48("5442", "5443", "5444"), mode === (stryMutAct_9fa48("5445") ? "" : (stryCov_9fa48("5445"), "real-m1")))) {
      if (stryMutAct_9fa48("5446")) {
        {}
      } else {
        stryCov_9fa48("5446");
        if (stryMutAct_9fa48("5449") ? (!hasOnlyKeys(body, ["email", "password"]) || typeof body.email !== "string") && typeof body.password !== "string" : stryMutAct_9fa48("5448") ? false : stryMutAct_9fa48("5447") ? true : (stryCov_9fa48("5447", "5448", "5449"), (stryMutAct_9fa48("5451") ? !hasOnlyKeys(body, ["email", "password"]) && typeof body.email !== "string" : stryMutAct_9fa48("5450") ? false : (stryCov_9fa48("5450", "5451"), (stryMutAct_9fa48("5452") ? hasOnlyKeys(body, ["email", "password"]) : (stryCov_9fa48("5452"), !hasOnlyKeys(body, stryMutAct_9fa48("5453") ? [] : (stryCov_9fa48("5453"), [stryMutAct_9fa48("5454") ? "" : (stryCov_9fa48("5454"), "email"), stryMutAct_9fa48("5455") ? "" : (stryCov_9fa48("5455"), "password")])))) || (stryMutAct_9fa48("5457") ? typeof body.email === "string" : stryMutAct_9fa48("5456") ? false : (stryCov_9fa48("5456", "5457"), typeof body.email !== (stryMutAct_9fa48("5458") ? "" : (stryCov_9fa48("5458"), "string")))))) || (stryMutAct_9fa48("5460") ? typeof body.password === "string" : stryMutAct_9fa48("5459") ? false : (stryCov_9fa48("5459", "5460"), typeof body.password !== (stryMutAct_9fa48("5461") ? "" : (stryCov_9fa48("5461"), "string")))))) {
          if (stryMutAct_9fa48("5462")) {
            {}
          } else {
            stryCov_9fa48("5462");
            return loginFailure(400, stryMutAct_9fa48("5463") ? "" : (stryCov_9fa48("5463"), "Ingrese un correo y una contraseña válidos."));
          }
        }
        const email = stryMutAct_9fa48("5464") ? body.email : (stryCov_9fa48("5464"), body.email.trim());
        const password = body.password;
        if (stryMutAct_9fa48("5467") ? (email.length === 0 || email.length > 320 || password.length === 0) && password.length > 1_024 : stryMutAct_9fa48("5466") ? false : stryMutAct_9fa48("5465") ? true : (stryCov_9fa48("5465", "5466", "5467"), (stryMutAct_9fa48("5469") ? (email.length === 0 || email.length > 320) && password.length === 0 : stryMutAct_9fa48("5468") ? false : (stryCov_9fa48("5468", "5469"), (stryMutAct_9fa48("5471") ? email.length === 0 && email.length > 320 : stryMutAct_9fa48("5470") ? false : (stryCov_9fa48("5470", "5471"), (stryMutAct_9fa48("5473") ? email.length !== 0 : stryMutAct_9fa48("5472") ? false : (stryCov_9fa48("5472", "5473"), email.length === 0)) || (stryMutAct_9fa48("5476") ? email.length <= 320 : stryMutAct_9fa48("5475") ? email.length >= 320 : stryMutAct_9fa48("5474") ? false : (stryCov_9fa48("5474", "5475", "5476"), email.length > 320)))) || (stryMutAct_9fa48("5478") ? password.length !== 0 : stryMutAct_9fa48("5477") ? false : (stryCov_9fa48("5477", "5478"), password.length === 0)))) || (stryMutAct_9fa48("5481") ? password.length <= 1_024 : stryMutAct_9fa48("5480") ? password.length >= 1_024 : stryMutAct_9fa48("5479") ? false : (stryCov_9fa48("5479", "5480", "5481"), password.length > 1_024)))) {
          if (stryMutAct_9fa48("5482")) {
            {}
          } else {
            stryCov_9fa48("5482");
            return loginFailure(400, stryMutAct_9fa48("5483") ? "" : (stryCov_9fa48("5483"), "Ingrese un correo y una contraseña válidos."));
          }
        }
        try {
          if (stryMutAct_9fa48("5484")) {
            {}
          } else {
            stryCov_9fa48("5484");
            const backendOrigin = process.env.M6_BACKEND_ORIGIN;
            if (stryMutAct_9fa48("5486") ? false : stryMutAct_9fa48("5485") ? true : (stryCov_9fa48("5485", "5486"), backendOrigin)) if (stryMutAct_9fa48("5487")) {
              ;
            } else {
              stryCov_9fa48("5487");
              wakeBackend(backendOrigin);
            }
            const result = await loginWithM1(email, password);
            if (stryMutAct_9fa48("5490") ? result.claims.subType === "EMPLEADO" : stryMutAct_9fa48("5489") ? false : stryMutAct_9fa48("5488") ? true : (stryCov_9fa48("5488", "5489", "5490"), result.claims.subType !== (stryMutAct_9fa48("5491") ? "" : (stryCov_9fa48("5491"), "EMPLEADO")))) if (stryMutAct_9fa48("5492")) {
              ;
            } else {
              stryCov_9fa48("5492");
              throw new CitizenForbiddenError();
            }
            if (stryMutAct_9fa48("5495") ? false : stryMutAct_9fa48("5494") ? true : stryMutAct_9fa48("5493") ? backendOrigin : (stryCov_9fa48("5493", "5494", "5495"), !backendOrigin)) if (stryMutAct_9fa48("5496")) {
              ;
            } else {
              stryCov_9fa48("5496");
              throw new BackendUnavailableError(503);
            }
            const me = await fetchMeWithToken(backendOrigin, result.accessToken);
            if (stryMutAct_9fa48("5499") ? me.subType === "EMPLEADO" : stryMutAct_9fa48("5498") ? false : stryMutAct_9fa48("5497") ? true : (stryCov_9fa48("5497", "5498", "5499"), me.subType !== (stryMutAct_9fa48("5500") ? "" : (stryCov_9fa48("5500"), "EMPLEADO")))) if (stryMutAct_9fa48("5501")) {
              ;
            } else {
              stryCov_9fa48("5501");
              throw new CitizenForbiddenError();
            }
            if (stryMutAct_9fa48("5504") ? me.userId === result.claims.subject : stryMutAct_9fa48("5503") ? false : stryMutAct_9fa48("5502") ? true : (stryCov_9fa48("5502", "5503", "5504"), me.userId !== result.claims.subject)) if (stryMutAct_9fa48("5505")) {
              ;
            } else {
              stryCov_9fa48("5505");
              throw new InvalidSessionError();
            }
            const created = createM1Session(stryMutAct_9fa48("5506") ? {} : (stryCov_9fa48("5506"), {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              jwtExpiresAt: result.claims.expiresAt,
              identity: stryMutAct_9fa48("5507") ? {} : (stryCov_9fa48("5507"), {
                userId: result.claims.subject,
                subType: stryMutAct_9fa48("5508") ? "" : (stryCov_9fa48("5508"), "EMPLEADO"),
                m1Role: me.m1Role
              }),
              roles: me.roles
            }));
            return sessionResponse(request, sessionFromMe(created, me));
          }
        } catch (error) {
          if (stryMutAct_9fa48("5509")) {
            {}
          } else {
            stryCov_9fa48("5509");
            if (stryMutAct_9fa48("5511") ? false : stryMutAct_9fa48("5510") ? true : (stryCov_9fa48("5510", "5511"), error instanceof M1CredentialsRejectedError)) return loginFailure(401, stryMutAct_9fa48("5512") ? "" : (stryCov_9fa48("5512"), "El correo o la contraseña no son correctos."));
            if (stryMutAct_9fa48("5514") ? false : stryMutAct_9fa48("5513") ? true : (stryCov_9fa48("5513", "5514"), error instanceof M1AccountBlockedError)) return loginFailure(403, stryMutAct_9fa48("5515") ? "" : (stryCov_9fa48("5515"), "La cuenta no puede iniciar sesión. Comuníquese con el administrador del sistema."));
            if (stryMutAct_9fa48("5517") ? false : stryMutAct_9fa48("5516") ? true : (stryCov_9fa48("5516", "5517"), error instanceof CitizenForbiddenError)) return loginFailure(403, stryMutAct_9fa48("5518") ? "" : (stryCov_9fa48("5518"), "Esta cuenta no tiene acceso a Ambiente e Higiene."));
            if (stryMutAct_9fa48("5520") ? false : stryMutAct_9fa48("5519") ? true : (stryCov_9fa48("5519", "5520"), error instanceof InvalidSessionError)) return loginFailure(401, stryMutAct_9fa48("5521") ? "" : (stryCov_9fa48("5521"), "No se pudo validar el ingreso con Ambiente. Intente nuevamente."));
            if (stryMutAct_9fa48("5523") ? false : stryMutAct_9fa48("5522") ? true : (stryCov_9fa48("5522", "5523"), error instanceof M1InvalidResponseError)) return loginFailure(502, stryMutAct_9fa48("5524") ? "" : (stryCov_9fa48("5524"), "El servicio de ingreso devolvió una respuesta inválida."));
            if (stryMutAct_9fa48("5526") ? false : stryMutAct_9fa48("5525") ? true : (stryCov_9fa48("5525", "5526"), error instanceof M1LoginTimeoutError)) return loginFailure(504, stryMutAct_9fa48("5527") ? "" : (stryCov_9fa48("5527"), "El servicio de ingreso no respondió dentro de un minuto y medio. Intente nuevamente."));
            if (stryMutAct_9fa48("5529") ? false : stryMutAct_9fa48("5528") ? true : (stryCov_9fa48("5528", "5529"), error instanceof M1ServiceUnavailableError)) return loginFailure(503, stryMutAct_9fa48("5530") ? "" : (stryCov_9fa48("5530"), "El servicio de ingreso no está disponible. Intente nuevamente en unos minutos."));
            if (stryMutAct_9fa48("5532") ? false : stryMutAct_9fa48("5531") ? true : (stryCov_9fa48("5531", "5532"), error instanceof BackendUnavailableError)) return loginFailure(503, stryMutAct_9fa48("5533") ? "" : (stryCov_9fa48("5533"), "El servicio de Ambiente no está disponible. Intente nuevamente en unos minutos."));
            if (stryMutAct_9fa48("5535") ? false : stryMutAct_9fa48("5534") ? true : (stryCov_9fa48("5534", "5535"), error instanceof AuthUnavailableError)) return loginFailure(503, error.message);
            return loginFailure(500, stryMutAct_9fa48("5536") ? "" : (stryCov_9fa48("5536"), "No se pudo iniciar la sesión. Intente nuevamente."));
          }
        }
      }
    }
    if (stryMutAct_9fa48("5539") ? !hasOnlyKeys(body, ["scenarioId"]) && !isScenarioId(body.scenarioId) : stryMutAct_9fa48("5538") ? false : stryMutAct_9fa48("5537") ? true : (stryCov_9fa48("5537", "5538", "5539"), (stryMutAct_9fa48("5540") ? hasOnlyKeys(body, ["scenarioId"]) : (stryCov_9fa48("5540"), !hasOnlyKeys(body, stryMutAct_9fa48("5541") ? [] : (stryCov_9fa48("5541"), [stryMutAct_9fa48("5542") ? "" : (stryCov_9fa48("5542"), "scenarioId")])))) || (stryMutAct_9fa48("5543") ? isScenarioId(body.scenarioId) : (stryCov_9fa48("5543"), !isScenarioId(body.scenarioId))))) {
      if (stryMutAct_9fa48("5544")) {
        {}
      } else {
        stryCov_9fa48("5544");
        return loginFailure(400, stryMutAct_9fa48("5545") ? "" : (stryCov_9fa48("5545"), "Seleccione un escenario operativo válido."));
      }
    }
    try {
      if (stryMutAct_9fa48("5546")) {
        {}
      } else {
        stryCov_9fa48("5546");
        if (stryMutAct_9fa48("5549") ? getScenario(body.scenarioId).subType !== "CIUDADANO" : stryMutAct_9fa48("5548") ? false : stryMutAct_9fa48("5547") ? true : (stryCov_9fa48("5547", "5548", "5549"), getScenario(body.scenarioId).subType === (stryMutAct_9fa48("5550") ? "" : (stryCov_9fa48("5550"), "CIUDADANO")))) if (stryMutAct_9fa48("5551")) {
          ;
        } else {
          stryCov_9fa48("5551");
          throw new CitizenForbiddenError();
        }
        return sessionResponse(request, createSession(body.scenarioId, stryMutAct_9fa48("5552") ? {} : (stryCov_9fa48("5552"), {
          mode
        })));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5553")) {
        {}
      } else {
        stryCov_9fa48("5553");
        if (stryMutAct_9fa48("5555") ? false : stryMutAct_9fa48("5554") ? true : (stryCov_9fa48("5554", "5555"), error instanceof CitizenForbiddenError)) {
          if (stryMutAct_9fa48("5556")) {
            {}
          } else {
            stryCov_9fa48("5556");
            return loginFailure(403, error.message);
          }
        }
        return loginFailure(500, stryMutAct_9fa48("5557") ? "" : (stryCov_9fa48("5557"), "No se pudo iniciar la sesión."));
      }
    }
  }
}
function wakeBackend(origin: string): void {
  if (stryMutAct_9fa48("5558")) {
    {}
  } else {
    stryCov_9fa48("5558");
    try {
      if (stryMutAct_9fa48("5559")) {
        {}
      } else {
        stryCov_9fa48("5559");
        void fetch(new URL(stryMutAct_9fa48("5560") ? "" : (stryCov_9fa48("5560"), "/health"), origin), stryMutAct_9fa48("5561") ? {} : (stryCov_9fa48("5561"), {
          method: stryMutAct_9fa48("5562") ? "" : (stryCov_9fa48("5562"), "GET"),
          cache: stryMutAct_9fa48("5563") ? "" : (stryCov_9fa48("5563"), "no-store"),
          redirect: stryMutAct_9fa48("5564") ? "" : (stryCov_9fa48("5564"), "error"),
          signal: AbortSignal.timeout(2_000)
        })).catch(() => undefined);
      }
    } catch {
      // The real /me call below reports a misconfigured or unavailable backend.
    }
  }
}
async function readBoundedJson(request: Request): Promise<unknown> {
  if (stryMutAct_9fa48("5565")) {
    {}
  } else {
    stryCov_9fa48("5565");
    const contentLength = request.headers.get(stryMutAct_9fa48("5566") ? "" : (stryCov_9fa48("5566"), "content-length"));
    if (stryMutAct_9fa48("5569") ? contentLength && /^\d+$/.test(contentLength) || Number(contentLength) > MAX_LOGIN_BODY_BYTES : stryMutAct_9fa48("5568") ? false : stryMutAct_9fa48("5567") ? true : (stryCov_9fa48("5567", "5568", "5569"), (stryMutAct_9fa48("5571") ? contentLength || /^\d+$/.test(contentLength) : stryMutAct_9fa48("5570") ? true : (stryCov_9fa48("5570", "5571"), contentLength && (stryMutAct_9fa48("5575") ? /^\D+$/ : stryMutAct_9fa48("5574") ? /^\d$/ : stryMutAct_9fa48("5573") ? /^\d+/ : stryMutAct_9fa48("5572") ? /\d+$/ : (stryCov_9fa48("5572", "5573", "5574", "5575"), /^\d+$/)).test(contentLength))) && (stryMutAct_9fa48("5578") ? Number(contentLength) <= MAX_LOGIN_BODY_BYTES : stryMutAct_9fa48("5577") ? Number(contentLength) >= MAX_LOGIN_BODY_BYTES : stryMutAct_9fa48("5576") ? true : (stryCov_9fa48("5576", "5577", "5578"), Number(contentLength) > MAX_LOGIN_BODY_BYTES)))) {
      if (stryMutAct_9fa48("5579")) {
        {}
      } else {
        stryCov_9fa48("5579");
        if (stryMutAct_9fa48("5580")) {
          ;
        } else {
          stryCov_9fa48("5580");
          throw new LoginBodyTooLargeError();
        }
      }
    }
    const reader = stryMutAct_9fa48("5581") ? request.body.getReader() : (stryCov_9fa48("5581"), request.body?.getReader());
    if (stryMutAct_9fa48("5584") ? false : stryMutAct_9fa48("5583") ? true : stryMutAct_9fa48("5582") ? reader : (stryCov_9fa48("5582", "5583", "5584"), !reader)) throw new Error(stryMutAct_9fa48("5586") ? "" : (stryCov_9fa48("5586"), "missing body"));
    const chunks: Uint8Array[] = stryMutAct_9fa48("5587") ? ["Stryker was here"] : (stryCov_9fa48("5587"), []);
    let byteLength = 0;
    try {
      if (stryMutAct_9fa48("5588")) {
        {}
      } else {
        stryCov_9fa48("5588");
        while (stryMutAct_9fa48("5590") ? false : stryMutAct_9fa48("5589") ? false : (stryCov_9fa48("5589", "5590"), true)) {
          if (stryMutAct_9fa48("5591")) {
            {}
          } else {
            stryCov_9fa48("5591");
            const {
              done,
              value
            } = await reader.read();
            if (stryMutAct_9fa48("5593") ? false : stryMutAct_9fa48("5592") ? true : (stryCov_9fa48("5592", "5593"), done)) break;
            if (stryMutAct_9fa48("5596") ? false : stryMutAct_9fa48("5595") ? true : stryMutAct_9fa48("5594") ? value : (stryCov_9fa48("5594", "5595", "5596"), !value)) continue;
            stryMutAct_9fa48("5597") ? byteLength -= value.byteLength : (stryCov_9fa48("5597"), byteLength += value.byteLength);
            if (stryMutAct_9fa48("5601") ? byteLength <= MAX_LOGIN_BODY_BYTES : stryMutAct_9fa48("5600") ? byteLength >= MAX_LOGIN_BODY_BYTES : stryMutAct_9fa48("5599") ? false : stryMutAct_9fa48("5598") ? true : (stryCov_9fa48("5598", "5599", "5600", "5601"), byteLength > MAX_LOGIN_BODY_BYTES)) {
              if (stryMutAct_9fa48("5602")) {
                {}
              } else {
                stryCov_9fa48("5602");
                await reader.cancel().catch(() => undefined);
                if (stryMutAct_9fa48("5603")) {
                  ;
                } else {
                  stryCov_9fa48("5603");
                  throw new LoginBodyTooLargeError();
                }
              }
            }
            if (stryMutAct_9fa48("5604")) {
              ;
            } else {
              stryCov_9fa48("5604");
              chunks.push(value);
            }
          }
        }
      }
    } finally {
      if (stryMutAct_9fa48("5605")) {
        {}
      } else {
        stryCov_9fa48("5605");
        if (stryMutAct_9fa48("5606")) {
          ;
        } else {
          stryCov_9fa48("5606");
          reader.releaseLock();
        }
      }
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      if (stryMutAct_9fa48("5607")) {
        {}
      } else {
        stryCov_9fa48("5607");
        if (stryMutAct_9fa48("5608")) {
          ;
        } else {
          stryCov_9fa48("5608");
          bytes.set(chunk, offset);
        }
        stryMutAct_9fa48("5609") ? offset -= chunk.byteLength : (stryCov_9fa48("5609"), offset += chunk.byteLength);
      }
    }
    return JSON.parse(new TextDecoder(stryMutAct_9fa48("5610") ? "" : (stryCov_9fa48("5610"), "utf-8"), stryMutAct_9fa48("5611") ? {} : (stryCov_9fa48("5611"), {
      fatal: stryMutAct_9fa48("5612") ? false : (stryCov_9fa48("5612"), true)
    })).decode(bytes));
  }
}
function sessionResponse(request: Request, session: Parameters<typeof publicSession>[0]) {
  if (stryMutAct_9fa48("5613")) {
    {}
  } else {
    stryCov_9fa48("5613");
    const response = NextResponse.json(stryMutAct_9fa48("5614") ? {} : (stryCov_9fa48("5614"), {
      session: publicSession(session)
    }));
    response.headers.set(stryMutAct_9fa48("5616") ? "" : (stryCov_9fa48("5616"), "cache-control"), stryMutAct_9fa48("5617") ? "" : (stryCov_9fa48("5617"), "no-store"));
    response.cookies.set(stryMutAct_9fa48("5619") ? {} : (stryCov_9fa48("5619"), {
      name: AUTH_COOKIE_NAME,
      value: sealSession(session),
      ...sessionCookieOptions(session, request)
    }));
    response.cookies.set(SESSION_MARKER_COOKIE_NAME, stryMutAct_9fa48("5621") ? "" : (stryCov_9fa48("5621"), "1"), sessionMarkerCookieOptions(request));
    return response;
  }
}