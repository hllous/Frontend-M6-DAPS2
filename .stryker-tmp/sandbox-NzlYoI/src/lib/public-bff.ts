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
import type { ZodType } from "zod";
import { errorResponse } from "./bff-route";
import { getAuthMode } from "./session";

/**
 * Módulo BFF público: sin sesión. No lee la cookie ni usa `fetchBackend`, así que ningún
 * `Authorization` puede salir de acá. Las rutas de `/api/public/` lo comparten.
 */

const PUBLIC_BACKEND_TIMEOUT_MS = 15_000;
const UNAVAILABLE_MESSAGE = stryMutAct_9fa48("12331") ? "" : (stryCov_9fa48("12331"), "El servicio no responde en este momento.");
export function publicMockMode(): boolean {
  if (stryMutAct_9fa48("12332")) {
    {}
  } else {
    stryCov_9fa48("12332");
    return stryMutAct_9fa48("12335") ? getAuthMode() !== "mock" : stryMutAct_9fa48("12334") ? false : stryMutAct_9fa48("12333") ? true : (stryCov_9fa48("12333", "12334", "12335"), getAuthMode() === (stryMutAct_9fa48("12336") ? "" : (stryCov_9fa48("12336"), "mock")));
  }
}

/** Toda respuesta pública va sin caché salvo que la ruta indique otra cosa. */
export function withCacheControl<T extends Response>(response: T, cacheControl = stryMutAct_9fa48("12337") ? "" : (stryCov_9fa48("12337"), "no-store")): T {
  if (stryMutAct_9fa48("12338")) {
    {}
  } else {
    stryCov_9fa48("12338");
    response.headers.set(stryMutAct_9fa48("12340") ? "" : (stryCov_9fa48("12340"), "cache-control"), cacheControl);
    return response;
  }
}
export function publicError(status: number, message: string, path: string, retryAfter?: string | null): NextResponse {
  if (stryMutAct_9fa48("12341")) {
    {}
  } else {
    stryCov_9fa48("12341");
    const response = errorResponse(status, message, path);
    if (stryMutAct_9fa48("12343") ? false : stryMutAct_9fa48("12342") ? true : (stryCov_9fa48("12342", "12343"), retryAfter)) response.headers.set(stryMutAct_9fa48("12345") ? "" : (stryCov_9fa48("12345"), "retry-after"), retryAfter);
    return withCacheControl(response);
  }
}

/**
 * IP del vecino según la plataforma (primer salto de `X-Forwarded-For`).
 * En Vercel es confiable: la plataforma sobrescribe el header con la IP pública del cliente y no reenvía IPs externas
 * (vercel.com/docs/headers/request-headers#x-forwarded-for; `x-real-ip` es idéntico). Fuera de Vercel (Docker, local) nada
 * lo garantiza: un cliente podría mandarlo, así que ahí la IP solo sirve si un proxy propio lo sobrescribe.
 */
function residentIp(request: Request): string | undefined {
  if (stryMutAct_9fa48("12346")) {
    {}
  } else {
    stryCov_9fa48("12346");
    const forwarded = stryMutAct_9fa48("12349") ? request.headers.get("x-forwarded-for").split(",")[0]?.trim() : stryMutAct_9fa48("12348") ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : stryMutAct_9fa48("12347") ? request.headers.get("x-forwarded-for")?.split(",")[0] : (stryCov_9fa48("12347", "12348", "12349"), request.headers.get(stryMutAct_9fa48("12350") ? "" : (stryCov_9fa48("12350"), "x-forwarded-for"))?.split(stryMutAct_9fa48("12351") ? "" : (stryCov_9fa48("12351"), ","))[0]?.trim());
    return stryMutAct_9fa48("12354") ? (forwarded || request.headers.get("x-real-ip")?.trim()) && undefined : stryMutAct_9fa48("12353") ? false : stryMutAct_9fa48("12352") ? true : (stryCov_9fa48("12352", "12353", "12354"), (stryMutAct_9fa48("12356") ? forwarded && request.headers.get("x-real-ip")?.trim() : stryMutAct_9fa48("12355") ? false : (stryCov_9fa48("12355", "12356"), forwarded || (stryMutAct_9fa48("12358") ? request.headers.get("x-real-ip").trim() : stryMutAct_9fa48("12357") ? request.headers.get("x-real-ip") : (stryCov_9fa48("12357", "12358"), request.headers.get(stryMutAct_9fa48("12359") ? "" : (stryCov_9fa48("12359"), "x-real-ip"))?.trim())))) || undefined);
  }
}

/** GET al backend sin credenciales; reenvía la IP del vecino para el límite de tasa por dirección. */
export async function fetchPublicBackend(request: Request, resourcePath: string): Promise<Response> {
  if (stryMutAct_9fa48("12360")) {
    {}
  } else {
    stryCov_9fa48("12360");
    const origin = process.env.M6_BACKEND_ORIGIN;
    if (stryMutAct_9fa48("12363") ? false : stryMutAct_9fa48("12362") ? true : stryMutAct_9fa48("12361") ? origin : (stryCov_9fa48("12361", "12362", "12363"), !origin)) return publicError(503, UNAVAILABLE_MESSAGE, new URL(request.url).pathname);
    const headers = new Headers(stryMutAct_9fa48("12364") ? {} : (stryCov_9fa48("12364"), {
      accept: stryMutAct_9fa48("12365") ? "" : (stryCov_9fa48("12365"), "application/json")
    }));
    const ip = residentIp(request);
    if (stryMutAct_9fa48("12367") ? false : stryMutAct_9fa48("12366") ? true : (stryCov_9fa48("12366", "12367"), ip)) headers.set(stryMutAct_9fa48("12369") ? "" : (stryCov_9fa48("12369"), "x-forwarded-for"), ip);
    // Con la clave el backend cree esa IP para su límite de tasa; sin ella cuenta la del BFF. Solo servidor, solo rutas públicas.
    const bffKey = stryMutAct_9fa48("12371") ? process.env.BFF_SHARED_KEY.trim() : stryMutAct_9fa48("12370") ? process.env.BFF_SHARED_KEY : (stryCov_9fa48("12370", "12371"), process.env.BFF_SHARED_KEY?.trim());
    if (stryMutAct_9fa48("12373") ? false : stryMutAct_9fa48("12372") ? true : (stryCov_9fa48("12372", "12373"), bffKey)) headers.set(stryMutAct_9fa48("12375") ? "" : (stryCov_9fa48("12375"), "x-m6-bff-key"), bffKey);
    try {
      if (stryMutAct_9fa48("12376")) {
        {}
      } else {
        stryCov_9fa48("12376");
        return await fetch(new URL(resourcePath, origin), stryMutAct_9fa48("12377") ? {} : (stryCov_9fa48("12377"), {
          method: stryMutAct_9fa48("12378") ? "" : (stryCov_9fa48("12378"), "GET"),
          headers,
          cache: stryMutAct_9fa48("12379") ? "" : (stryCov_9fa48("12379"), "no-store"),
          signal: AbortSignal.timeout(PUBLIC_BACKEND_TIMEOUT_MS)
        }));
      }
    } catch {
      if (stryMutAct_9fa48("12380")) {
        {}
      } else {
        stryCov_9fa48("12380");
        return publicError(503, UNAVAILABLE_MESSAGE, new URL(request.url).pathname);
      }
    }
  }
}

/**
 * Pasa 404 y 429 (con `Retry-After`) y convierte cualquier otro fallo en 502 sin filtrar el cuerpo del backend.
 * El cuerpo exitoso se parsea con el contrato público de la ruta: solo sale lo que el contrato declara, y un
 * cuerpo que no lo cumple es un 502.
 */
export async function relayPublicResponse<T>(response: Response, path: string, schema: ZodType<T>, cacheControl = stryMutAct_9fa48("12381") ? "" : (stryCov_9fa48("12381"), "no-store")): Promise<NextResponse> {
  if (stryMutAct_9fa48("12382")) {
    {}
  } else {
    stryCov_9fa48("12382");
    if (stryMutAct_9fa48("12385") ? response instanceof NextResponse || !response.ok : stryMutAct_9fa48("12384") ? false : stryMutAct_9fa48("12383") ? true : (stryCov_9fa48("12383", "12384", "12385"), response instanceof NextResponse && (stryMutAct_9fa48("12386") ? response.ok : (stryCov_9fa48("12386"), !response.ok)))) return response;
    if (stryMutAct_9fa48("12388") ? false : stryMutAct_9fa48("12387") ? true : (stryCov_9fa48("12387", "12388"), response.ok)) {
      if (stryMutAct_9fa48("12389")) {
        {}
      } else {
        stryCov_9fa48("12389");
        const body: unknown = await response.json().catch(() => undefined);
        if (stryMutAct_9fa48("12392") ? body !== undefined : stryMutAct_9fa48("12391") ? false : stryMutAct_9fa48("12390") ? true : (stryCov_9fa48("12390", "12391", "12392"), body === undefined)) return publicError(502, UNAVAILABLE_MESSAGE, path);
        const parsed = schema.safeParse(body);
        if (stryMutAct_9fa48("12395") ? false : stryMutAct_9fa48("12394") ? true : stryMutAct_9fa48("12393") ? parsed.success : (stryCov_9fa48("12393", "12394", "12395"), !parsed.success)) return publicError(502, UNAVAILABLE_MESSAGE, path);
        return withCacheControl(NextResponse.json(parsed.data), cacheControl);
      }
    }
    void (stryMutAct_9fa48("12396") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("12396"), response.body?.cancel().catch(() => undefined)));
    if (stryMutAct_9fa48("12399") ? response.status !== 404 : stryMutAct_9fa48("12398") ? false : stryMutAct_9fa48("12397") ? true : (stryCov_9fa48("12397", "12398", "12399"), response.status === 404)) return publicError(404, stryMutAct_9fa48("12400") ? "" : (stryCov_9fa48("12400"), "No se encontró lo que buscabas."), path);
    if (stryMutAct_9fa48("12403") ? response.status !== 429 : stryMutAct_9fa48("12402") ? false : stryMutAct_9fa48("12401") ? true : (stryCov_9fa48("12401", "12402", "12403"), response.status === 429)) return publicError(429, stryMutAct_9fa48("12404") ? "" : (stryCov_9fa48("12404"), "Demasiadas consultas seguidas."), path, response.headers.get(stryMutAct_9fa48("12405") ? "" : (stryCov_9fa48("12405"), "retry-after")));
    if (stryMutAct_9fa48("12408") ? response.status !== 400 : stryMutAct_9fa48("12407") ? false : stryMutAct_9fa48("12406") ? true : (stryCov_9fa48("12406", "12407", "12408"), response.status === 400)) return publicError(400, stryMutAct_9fa48("12409") ? "" : (stryCov_9fa48("12409"), "La consulta no es válida."), path);
    return publicError(502, UNAVAILABLE_MESSAGE, path);
  }
}