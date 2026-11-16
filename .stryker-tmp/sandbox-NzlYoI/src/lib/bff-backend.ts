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
import { AuthUnavailableError, BackendUnavailableError, InvalidSessionError, getRequiredSession, getSessionFromRequest, rememberRenewedResponse, requireCapability, wasSessionRenewed } from "./session";
import { canRenew, isNearExpiry, renewRequestSession } from "./m1-refresh";
import type { Capability } from "./scenarios";
import { errorResponse } from "./bff-route";
import { rememberBffPath } from "./bff-response-path";
const INVALID_BACKEND_PATH_ID = stryMutAct_9fa48("6984") ? "" : (stryCov_9fa48("6984"), "\u0000invalid-backend-path-id\u0000");
const BACKEND_PATH_ID_PATTERN = stryMutAct_9fa48("6988") ? /^[^A-Za-z0-9._~-]{1,128}$/ : stryMutAct_9fa48("6987") ? /^[A-Za-z0-9._~-]$/ : stryMutAct_9fa48("6986") ? /^[A-Za-z0-9._~-]{1,128}/ : stryMutAct_9fa48("6985") ? /[A-Za-z0-9._~-]{1,128}$/ : (stryCov_9fa48("6985", "6986", "6987", "6988"), /^[A-Za-z0-9._~-]{1,128}$/);
const DEFAULT_BACKEND_TIMEOUT_MS = 15_000;
const BACKEND_UNAVAILABLE_MESSAGE = stryMutAct_9fa48("6989") ? "" : (stryCov_9fa48("6989"), "El sistema no responde. Reintente en unos segundos.");
export type FetchBackendOptions = {
  timeoutMs?: number;
};
export function pathId(id: string): string {
  if (stryMutAct_9fa48("6990")) {
    {}
  } else {
    stryCov_9fa48("6990");
    if (stryMutAct_9fa48("6993") ? (!BACKEND_PATH_ID_PATTERN.test(id) || id === ".") && id === ".." : stryMutAct_9fa48("6992") ? false : stryMutAct_9fa48("6991") ? true : (stryCov_9fa48("6991", "6992", "6993"), (stryMutAct_9fa48("6995") ? !BACKEND_PATH_ID_PATTERN.test(id) && id === "." : stryMutAct_9fa48("6994") ? false : (stryCov_9fa48("6994", "6995"), (stryMutAct_9fa48("6996") ? BACKEND_PATH_ID_PATTERN.test(id) : (stryCov_9fa48("6996"), !BACKEND_PATH_ID_PATTERN.test(id))) || (stryMutAct_9fa48("6998") ? id !== "." : stryMutAct_9fa48("6997") ? false : (stryCov_9fa48("6997", "6998"), id === (stryMutAct_9fa48("6999") ? "" : (stryCov_9fa48("6999"), ".")))))) || (stryMutAct_9fa48("7001") ? id !== ".." : stryMutAct_9fa48("7000") ? false : (stryCov_9fa48("7000", "7001"), id === (stryMutAct_9fa48("7002") ? "" : (stryCov_9fa48("7002"), "..")))))) {
      if (stryMutAct_9fa48("7003")) {
        {}
      } else {
        stryCov_9fa48("7003");
        return INVALID_BACKEND_PATH_ID;
      }
    }
    return encodeURIComponent(id);
  }
}
const RATE_LIMIT_MESSAGE = stryMutAct_9fa48("7004") ? "" : (stryCov_9fa48("7004"), "Hay demasiados pedidos en curso. Espere unos segundos e intente de nuevo.");

/**
 * Tipos de contenido JSON que el BFF deja pasar: los dos que emite el Backend. Desde Backend #597 los errores salen como
 * `application/problem+json` (RFC 9457); comparar solo con `application/json` los trataría como ilegibles. Es una lista
 * cerrada a propósito: cualquier otro tipo, incluidos otros `+json`, `application/jsonp` y `text/*`, se sigue envolviendo.
 */
const JSON_MEDIA_TYPES = new Set(stryMutAct_9fa48("7005") ? [] : (stryCov_9fa48("7005"), [stryMutAct_9fa48("7006") ? "" : (stryCov_9fa48("7006"), "application/json"), stryMutAct_9fa48("7007") ? "" : (stryCov_9fa48("7007"), "application/problem+json")]));
export function isJsonMediaType(contentType: string | null | undefined): boolean {
  if (stryMutAct_9fa48("7008")) {
    {}
  } else {
    stryCov_9fa48("7008");
    const mediaType = stryMutAct_9fa48("7012") ? contentType.split(";", 1)[0]?.trim().toLowerCase() : stryMutAct_9fa48("7011") ? contentType?.split(";", 1)[0].trim().toLowerCase() : stryMutAct_9fa48("7010") ? contentType?.split(";", 1)[0].toLowerCase() : stryMutAct_9fa48("7009") ? contentType?.split(";", 1)[0]?.trim().toUpperCase() : (stryCov_9fa48("7009", "7010", "7011", "7012"), contentType?.split(stryMutAct_9fa48("7013") ? "" : (stryCov_9fa48("7013"), ";"), 1)[0]?.trim().toLowerCase());
    return stryMutAct_9fa48("7016") ? mediaType !== undefined || JSON_MEDIA_TYPES.has(mediaType) : stryMutAct_9fa48("7015") ? false : stryMutAct_9fa48("7014") ? true : (stryCov_9fa48("7014", "7015", "7016"), (stryMutAct_9fa48("7018") ? mediaType === undefined : stryMutAct_9fa48("7017") ? true : (stryCov_9fa48("7017", "7018"), mediaType !== undefined)) && JSON_MEDIA_TYPES.has(mediaType));
  }
}
async function clarifyBackendError(response: Response, method: string): Promise<Response> {
  if (stryMutAct_9fa48("7019")) {
    {}
  } else {
    stryCov_9fa48("7019");
    if (stryMutAct_9fa48("7022") ? response.ok && !isJsonMediaType(response.headers.get("content-type")) : stryMutAct_9fa48("7021") ? false : stryMutAct_9fa48("7020") ? true : (stryCov_9fa48("7020", "7021", "7022"), response.ok || (stryMutAct_9fa48("7023") ? isJsonMediaType(response.headers.get("content-type")) : (stryCov_9fa48("7023"), !isJsonMediaType(response.headers.get(stryMutAct_9fa48("7024") ? "" : (stryCov_9fa48("7024"), "content-type"))))))) return response;
    const payload: unknown = await response.clone().json().catch(stryMutAct_9fa48("7025") ? () => undefined : (stryCov_9fa48("7025"), () => null));
    if (stryMutAct_9fa48("7028") ? (!payload || typeof payload !== "object") && Array.isArray(payload) : stryMutAct_9fa48("7027") ? false : stryMutAct_9fa48("7026") ? true : (stryCov_9fa48("7026", "7027", "7028"), (stryMutAct_9fa48("7030") ? !payload && typeof payload !== "object" : stryMutAct_9fa48("7029") ? false : (stryCov_9fa48("7029", "7030"), (stryMutAct_9fa48("7031") ? payload : (stryCov_9fa48("7031"), !payload)) || (stryMutAct_9fa48("7033") ? typeof payload === "object" : stryMutAct_9fa48("7032") ? false : (stryCov_9fa48("7032", "7033"), typeof payload !== (stryMutAct_9fa48("7034") ? "" : (stryCov_9fa48("7034"), "object")))))) || Array.isArray(payload))) return response;
    const record = payload as Record<string, unknown>;
    const message = record.message;
    const values = Array.isArray(message) ? message : stryMutAct_9fa48("7035") ? [] : (stryCov_9fa48("7035"), [message]);
    const rateLimited = stryMutAct_9fa48("7038") ? response.status !== 429 : stryMutAct_9fa48("7037") ? false : stryMutAct_9fa48("7036") ? true : (stryCov_9fa48("7036", "7037", "7038"), response.status === 429);
    const mentionsInternals = stryMutAct_9fa48("7039") ? values.every(value => typeof value === "string" && /\bm[oó]dulo\s+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i.test(value)) : (stryCov_9fa48("7039"), values.some(stryMutAct_9fa48("7040") ? () => undefined : (stryCov_9fa48("7040"), value => stryMutAct_9fa48("7043") ? typeof value === "string" || /\bm[oó]dulo\s+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i.test(value) : stryMutAct_9fa48("7042") ? false : stryMutAct_9fa48("7041") ? true : (stryCov_9fa48("7041", "7042", "7043"), (stryMutAct_9fa48("7045") ? typeof value !== "string" : stryMutAct_9fa48("7044") ? true : (stryCov_9fa48("7044", "7045"), typeof value === (stryMutAct_9fa48("7046") ? "" : (stryCov_9fa48("7046"), "string")))) && (stryMutAct_9fa48("7051") ? /\bm[oó]dulo\s+[1-9]\b|\bM[^1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i : stryMutAct_9fa48("7050") ? /\bm[oó]dulo\s+[^1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i : stryMutAct_9fa48("7049") ? /\bm[oó]dulo\S+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i : stryMutAct_9fa48("7048") ? /\bm[oó]dulo\s[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i : stryMutAct_9fa48("7047") ? /\bm[^oó]dulo\s+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i : (stryCov_9fa48("7047", "7048", "7049", "7050", "7051"), /\bm[oó]dulo\s+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i)).test(value)))));
    if (stryMutAct_9fa48("7054") ? !rateLimited || !mentionsInternals : stryMutAct_9fa48("7053") ? false : stryMutAct_9fa48("7052") ? true : (stryCov_9fa48("7052", "7053", "7054"), (stryMutAct_9fa48("7055") ? rateLimited : (stryCov_9fa48("7055"), !rateLimited)) && (stryMutAct_9fa48("7056") ? mentionsInternals : (stryCov_9fa48("7056"), !mentionsInternals)))) return response;
    const replacement = rateLimited ? RATE_LIMIT_MESSAGE : (stryMutAct_9fa48("7057") ? [] : (stryCov_9fa48("7057"), [stryMutAct_9fa48("7058") ? "" : (stryCov_9fa48("7058"), "GET"), stryMutAct_9fa48("7059") ? "" : (stryCov_9fa48("7059"), "HEAD")])).includes(stryMutAct_9fa48("7060") ? method.toLowerCase() : (stryCov_9fa48("7060"), method.toUpperCase())) ? stryMutAct_9fa48("7061") ? "" : (stryCov_9fa48("7061"), "No se pudo obtener la información. Reintente en unos segundos.") : (stryMutAct_9fa48("7064") ? response.status >= 400 || response.status < 500 : stryMutAct_9fa48("7063") ? false : stryMutAct_9fa48("7062") ? true : (stryCov_9fa48("7062", "7063", "7064"), (stryMutAct_9fa48("7067") ? response.status < 400 : stryMutAct_9fa48("7066") ? response.status > 400 : stryMutAct_9fa48("7065") ? true : (stryCov_9fa48("7065", "7066", "7067"), response.status >= 400)) && (stryMutAct_9fa48("7070") ? response.status >= 500 : stryMutAct_9fa48("7069") ? response.status <= 500 : stryMutAct_9fa48("7068") ? true : (stryCov_9fa48("7068", "7069", "7070"), response.status < 500)))) ? stryMutAct_9fa48("7071") ? "" : (stryCov_9fa48("7071"), "No se pudo realizar la operación. Revise los datos e inténtelo nuevamente.") : stryMutAct_9fa48("7072") ? "" : (stryCov_9fa48("7072"), "No se pudo confirmar el resultado de la operación. Verifique si se completó antes de reintentar.");
    const headers = new Headers(response.headers);
    headers.delete(stryMutAct_9fa48("7074") ? "" : (stryCov_9fa48("7074"), "content-length"));
    headers.delete(stryMutAct_9fa48("7076") ? "" : (stryCov_9fa48("7076"), "content-encoding"));
    void (stryMutAct_9fa48("7077") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("7077"), response.body?.cancel().catch(() => undefined)));
    // `detail` (RFC 9457) repite `message`: si solo se reescribiera `message`, el texto original llegaría por `detail`.
    const clarified = stryMutAct_9fa48("7078") ? {} : (stryCov_9fa48("7078"), {
      ...record,
      message: replacement,
      ...((stryMutAct_9fa48("7079") ? "" : (stryCov_9fa48("7079"), "detail")) in record ? stryMutAct_9fa48("7080") ? {} : (stryCov_9fa48("7080"), {
        detail: replacement
      }) : {})
    });
    return new Response(JSON.stringify(clarified), stryMutAct_9fa48("7081") ? {} : (stryCov_9fa48("7081"), {
      status: response.status,
      statusText: response.statusText,
      headers
    }));
  }
}
export async function fetchBackend(request: Request, resourcePath: string, capability?: Capability, init: RequestInit = {}, options: FetchBackendOptions = {}): Promise<Response> {
  if (stryMutAct_9fa48("7082")) {
    {}
  } else {
    stryCov_9fa48("7082");
    let session = getRequiredSession(request);
    if (stryMutAct_9fa48("7084") ? false : stryMutAct_9fa48("7083") ? true : (stryCov_9fa48("7083", "7084"), capability)) if (stryMutAct_9fa48("7085")) {
      ;
    } else {
      stryCov_9fa48("7085");
      requireCapability(session, capability);
    }
    if (stryMutAct_9fa48("7088") ? session.mode !== "mock" : stryMutAct_9fa48("7087") ? false : stryMutAct_9fa48("7086") ? true : (stryCov_9fa48("7086", "7087", "7088"), session.mode === (stryMutAct_9fa48("7089") ? "" : (stryCov_9fa48("7089"), "mock")))) {
      if (stryMutAct_9fa48("7090")) {
        {}
      } else {
        stryCov_9fa48("7090");
        throw new AuthUnavailableError(stryMutAct_9fa48("7092") ? "" : (stryCov_9fa48("7092"), "El modo mock no realiza llamadas al backend."));
      }
    }
    const backendOrigin = process.env.M6_BACKEND_ORIGIN;
    const sessionAccessToken = session.accessToken;
    if (stryMutAct_9fa48("7095") ? !backendOrigin && !sessionAccessToken : stryMutAct_9fa48("7094") ? false : stryMutAct_9fa48("7093") ? true : (stryCov_9fa48("7093", "7094", "7095"), (stryMutAct_9fa48("7096") ? backendOrigin : (stryCov_9fa48("7096"), !backendOrigin)) || (stryMutAct_9fa48("7097") ? sessionAccessToken : (stryCov_9fa48("7097"), !sessionAccessToken)))) {
      if (stryMutAct_9fa48("7098")) {
        {}
      } else {
        stryCov_9fa48("7098");
        throw new AuthUnavailableError(stryMutAct_9fa48("7100") ? "" : (stryCov_9fa48("7100"), "El sistema no está disponible. Comuníquese con el administrador del sistema."));
      }
    }
    if (stryMutAct_9fa48("7102") ? false : stryMutAct_9fa48("7101") ? true : (stryCov_9fa48("7101", "7102"), resourcePath.includes(INVALID_BACKEND_PATH_ID))) {
      if (stryMutAct_9fa48("7103")) {
        {}
      } else {
        stryCov_9fa48("7103");
        return errorResponse(400, stryMutAct_9fa48("7104") ? "" : (stryCov_9fa48("7104"), "Identificador inválido."), new URL(request.url).pathname);
      }
    }
    const backendUrl = new URL(backendOrigin);
    const resourceUrl = new URL(resourcePath, backendUrl);
    const suppliedPathname = resourcePath.split(stryMutAct_9fa48("7105") ? /[^?#]/ : (stryCov_9fa48("7105"), /[?#]/))[0];
    if (stryMutAct_9fa48("7108") ? (!resourcePath.startsWith("/") || resourceUrl.origin !== backendUrl.origin) && resourceUrl.pathname !== suppliedPathname : stryMutAct_9fa48("7107") ? false : stryMutAct_9fa48("7106") ? true : (stryCov_9fa48("7106", "7107", "7108"), (stryMutAct_9fa48("7110") ? !resourcePath.startsWith("/") && resourceUrl.origin !== backendUrl.origin : stryMutAct_9fa48("7109") ? false : (stryCov_9fa48("7109", "7110"), (stryMutAct_9fa48("7111") ? resourcePath.startsWith("/") : (stryCov_9fa48("7111"), !(stryMutAct_9fa48("7112") ? resourcePath.endsWith("/") : (stryCov_9fa48("7112"), resourcePath.startsWith(stryMutAct_9fa48("7113") ? "" : (stryCov_9fa48("7113"), "/")))))) || (stryMutAct_9fa48("7115") ? resourceUrl.origin === backendUrl.origin : stryMutAct_9fa48("7114") ? false : (stryCov_9fa48("7114", "7115"), resourceUrl.origin !== backendUrl.origin)))) || (stryMutAct_9fa48("7117") ? resourceUrl.pathname === suppliedPathname : stryMutAct_9fa48("7116") ? false : (stryCov_9fa48("7116", "7117"), resourceUrl.pathname !== suppliedPathname)))) {
      if (stryMutAct_9fa48("7118")) {
        {}
      } else {
        stryCov_9fa48("7118");
        throw new AuthUnavailableError(stryMutAct_9fa48("7120") ? "" : (stryCov_9fa48("7120"), "El recurso backend debe ser una ruta interna."));
      }
    }
    const headers = new Headers(init.headers);
    let accessToken: string = sessionAccessToken;
    // Renovación preventiva contra M1: el access token vence a los 15 min y M6 solo acepta ese token.
    if (stryMutAct_9fa48("7123") ? canRenew(session) || isNearExpiry(session) : stryMutAct_9fa48("7122") ? false : stryMutAct_9fa48("7121") ? true : (stryCov_9fa48("7121", "7122", "7123"), canRenew(session) && isNearExpiry(session))) {
      if (stryMutAct_9fa48("7124")) {
        {}
      } else {
        stryCov_9fa48("7124");
        const renewed = await renewRequestSession(request, session, stryMutAct_9fa48("7125") ? {} : (stryCov_9fa48("7125"), {
          tolerateUnavailable: stryMutAct_9fa48("7126") ? false : (stryCov_9fa48("7126"), true)
        }));
        session = renewed;
        accessToken = renewed.accessToken;
      }
    }
    const send = async (token: string) => {
      if (stryMutAct_9fa48("7127")) {
        {}
      } else {
        stryCov_9fa48("7127");
        headers.set(stryMutAct_9fa48("7129") ? "" : (stryCov_9fa48("7129"), "Authorization"), stryMutAct_9fa48("7130") ? `` : (stryCov_9fa48("7130"), `Bearer ${token}`));
        const timeoutSignal = AbortSignal.timeout(stryMutAct_9fa48("7131") ? options.timeoutMs && DEFAULT_BACKEND_TIMEOUT_MS : (stryCov_9fa48("7131"), options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS));
        const signal = init.signal ? AbortSignal.any(stryMutAct_9fa48("7132") ? [] : (stryCov_9fa48("7132"), [init.signal, timeoutSignal])) : timeoutSignal;
        return fetch(resourceUrl, stryMutAct_9fa48("7133") ? {} : (stryCov_9fa48("7133"), {
          ...init,
          headers,
          signal
        }));
      }
    };
    const finish = (response: Response): Response => {
      if (stryMutAct_9fa48("7134")) {
        {}
      } else {
        stryCov_9fa48("7134");
        const renewed = wasSessionRenewed(request) ? getSessionFromRequest(request) : undefined;
        if (stryMutAct_9fa48("7136") ? false : stryMutAct_9fa48("7135") ? true : (stryCov_9fa48("7135", "7136"), renewed)) if (stryMutAct_9fa48("7137")) {
          ;
        } else {
          stryCov_9fa48("7137");
          rememberRenewedResponse(response, renewed, request);
        }
        if (stryMutAct_9fa48("7138")) {
          ;
        } else {
          stryCov_9fa48("7138");
          rememberBffPath(response, new URL(request.url).pathname);
        }
        return response;
      }
    };
    try {
      if (stryMutAct_9fa48("7139")) {
        {}
      } else {
        stryCov_9fa48("7139");
        let response = await send(accessToken);
        // Un 401 con refresh disponible se reintenta UNA vez por pedido. Los bodies de un solo uso (stream, AsyncIterable) no se pueden reenviar.
        const replayable = stryMutAct_9fa48("7142") ? !(init.body instanceof ReadableStream) || !(typeof init.body === "object" && init.body !== null && Symbol.asyncIterator in init.body) : stryMutAct_9fa48("7141") ? false : stryMutAct_9fa48("7140") ? true : (stryCov_9fa48("7140", "7141", "7142"), (stryMutAct_9fa48("7143") ? init.body instanceof ReadableStream : (stryCov_9fa48("7143"), !(init.body instanceof ReadableStream))) && (stryMutAct_9fa48("7144") ? typeof init.body === "object" && init.body !== null && Symbol.asyncIterator in init.body : (stryCov_9fa48("7144"), !(stryMutAct_9fa48("7147") ? typeof init.body === "object" && init.body !== null || Symbol.asyncIterator in init.body : stryMutAct_9fa48("7146") ? false : stryMutAct_9fa48("7145") ? true : (stryCov_9fa48("7145", "7146", "7147"), (stryMutAct_9fa48("7149") ? typeof init.body === "object" || init.body !== null : stryMutAct_9fa48("7148") ? true : (stryCov_9fa48("7148", "7149"), (stryMutAct_9fa48("7151") ? typeof init.body !== "object" : stryMutAct_9fa48("7150") ? true : (stryCov_9fa48("7150", "7151"), typeof init.body === (stryMutAct_9fa48("7152") ? "" : (stryCov_9fa48("7152"), "object")))) && (stryMutAct_9fa48("7154") ? init.body === null : stryMutAct_9fa48("7153") ? true : (stryCov_9fa48("7153", "7154"), init.body !== null)))) && Symbol.asyncIterator in init.body)))));
        if (stryMutAct_9fa48("7157") ? response.status === 401 && replayable || canRenew(session) : stryMutAct_9fa48("7156") ? false : stryMutAct_9fa48("7155") ? true : (stryCov_9fa48("7155", "7156", "7157"), (stryMutAct_9fa48("7159") ? response.status === 401 || replayable : stryMutAct_9fa48("7158") ? true : (stryCov_9fa48("7158", "7159"), (stryMutAct_9fa48("7161") ? response.status !== 401 : stryMutAct_9fa48("7160") ? true : (stryCov_9fa48("7160", "7161"), response.status === 401)) && replayable)) && canRenew(session))) {
          if (stryMutAct_9fa48("7162")) {
            {}
          } else {
            stryCov_9fa48("7162");
            const current = getSessionFromRequest(request);
            const currentToken = stryMutAct_9fa48("7163") ? current.accessToken : (stryCov_9fa48("7163"), current?.accessToken);
            if (stryMutAct_9fa48("7166") ? currentToken || currentToken !== accessToken : stryMutAct_9fa48("7165") ? false : stryMutAct_9fa48("7164") ? true : (stryCov_9fa48("7164", "7165", "7166"), currentToken && (stryMutAct_9fa48("7168") ? currentToken === accessToken : stryMutAct_9fa48("7167") ? true : (stryCov_9fa48("7167", "7168"), currentToken !== accessToken)))) {
              if (stryMutAct_9fa48("7169")) {
                {}
              } else {
                stryCov_9fa48("7169");
                // Otra llamada del mismo pedido (Promise.all) ya renovó: se reintenta con su token, sin renovar de nuevo.
                void (stryMutAct_9fa48("7170") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("7170"), response.body?.cancel().catch(() => undefined)));
                accessToken = currentToken;
                response = await send(accessToken);
              }
            } else if (stryMutAct_9fa48("7173") ? false : stryMutAct_9fa48("7172") ? true : stryMutAct_9fa48("7171") ? wasSessionRenewed(request) : (stryCov_9fa48("7171", "7172", "7173"), !wasSessionRenewed(request))) {
              if (stryMutAct_9fa48("7174")) {
                {}
              } else {
                stryCov_9fa48("7174");
                void (stryMutAct_9fa48("7175") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("7175"), response.body?.cancel().catch(() => undefined)));
                const renewed = await renewRequestSession(request, session, stryMutAct_9fa48("7176") ? {} : (stryCov_9fa48("7176"), {
                  tolerateUnavailable: stryMutAct_9fa48("7177") ? true : (stryCov_9fa48("7177"), false)
                }));
                session = renewed;
                accessToken = renewed.accessToken;
                response = await send(accessToken);
              }
            }
          }
        }
        return finish(await clarifyBackendError(response, stryMutAct_9fa48("7178") ? init.method && "GET" : (stryCov_9fa48("7178"), init.method ?? (stryMutAct_9fa48("7179") ? "" : (stryCov_9fa48("7179"), "GET")))));
      }
    } catch (error) {
      if (stryMutAct_9fa48("7180")) {
        {}
      } else {
        stryCov_9fa48("7180");
        if (stryMutAct_9fa48("7183") ? init.signal.aborted : stryMutAct_9fa48("7182") ? false : stryMutAct_9fa48("7181") ? true : (stryCov_9fa48("7181", "7182", "7183"), init.signal?.aborted)) throw error;
        if (stryMutAct_9fa48("7186") ? error instanceof InvalidSessionError && error instanceof BackendUnavailableError : stryMutAct_9fa48("7185") ? false : stryMutAct_9fa48("7184") ? true : (stryCov_9fa48("7184", "7185", "7186"), error instanceof InvalidSessionError || error instanceof BackendUnavailableError)) throw error;
        if (stryMutAct_9fa48("7187")) {
          ;
        } else {
          stryCov_9fa48("7187");
          throw new BackendUnavailableError(503, BACKEND_UNAVAILABLE_MESSAGE);
        }
      }
    }
  }
}