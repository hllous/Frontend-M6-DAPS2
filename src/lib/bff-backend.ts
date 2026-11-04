import {
  AuthUnavailableError,
  BackendUnavailableError,
  InvalidSessionError,
  getRequiredSession,
  getSessionFromRequest,
  rememberRenewedResponse,
  requireCapability,
  wasSessionRenewed,
} from "./session";
import { canRenew, isNearExpiry, renewRequestSession } from "./m1-refresh";
import type { Capability } from "./scenarios";
import { errorResponse } from "./bff-route";
import { rememberBffPath } from "./bff-response-path";

const INVALID_BACKEND_PATH_ID = "\u0000invalid-backend-path-id\u0000";
const BACKEND_PATH_ID_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;
const DEFAULT_BACKEND_TIMEOUT_MS = 15_000;
const BACKEND_UNAVAILABLE_MESSAGE = "El sistema no responde. Reintente en unos segundos.";
export type FetchBackendOptions = {
  timeoutMs?: number;
};

export function pathId(id: string): string {
  if (!BACKEND_PATH_ID_PATTERN.test(id) || id === "." || id === "..") {
    return INVALID_BACKEND_PATH_ID;
  }
  return encodeURIComponent(id);
}

async function clarifyBackendError(response: Response, method: string): Promise<Response> {
  if (response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) return response;
  const payload: unknown = await response.clone().json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return response;
  const record = payload as Record<string, unknown>;
  const message = record.message;
  const values = Array.isArray(message) ? message : [message];
  if (!values.some((value) => typeof value === "string" && /\bm[oó]dulo\s+[1-9]\b|\bM[1-9]\b|backend|\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/i.test(value))) return response;
  const replacement = ["GET", "HEAD"].includes(method.toUpperCase())
    ? "No se pudo obtener la información. Reintente en unos segundos."
    : response.status >= 400 && response.status < 500
      ? "No se pudo realizar la operación. Revise los datos e inténtelo nuevamente."
      : "No se pudo confirmar el resultado de la operación. Verifique si se completó antes de reintentar.";
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  void response.body?.cancel().catch(() => undefined);
  return new Response(JSON.stringify({ ...record, message: replacement }), { status: response.status, statusText: response.statusText, headers });
}

export async function fetchBackend(
  request: Request,
  resourcePath: string,
  capability?: Capability,
  init: RequestInit = {},
  options: FetchBackendOptions = {},
): Promise<Response> {
  let session = getRequiredSession(request);
  if (capability) requireCapability(session, capability);

  if (session.mode === "mock") {
    throw new AuthUnavailableError("El modo mock no realiza llamadas al backend.");
  }

  const backendOrigin = process.env.M6_BACKEND_ORIGIN;
  const sessionAccessToken = session.accessToken;
  if (!backendOrigin || !sessionAccessToken) {
    throw new AuthUnavailableError("El sistema no está disponible. Comuníquese con el administrador del sistema.");
  }

  if (resourcePath.includes(INVALID_BACKEND_PATH_ID)) {
    return errorResponse(400, "Identificador inválido.", new URL(request.url).pathname);
  }

  const backendUrl = new URL(backendOrigin);
  const resourceUrl = new URL(resourcePath, backendUrl);
  const suppliedPathname = resourcePath.split(/[?#]/)[0];
  if (
    !resourcePath.startsWith("/") ||
    resourceUrl.origin !== backendUrl.origin ||
    resourceUrl.pathname !== suppliedPathname
  ) {
    throw new AuthUnavailableError("El recurso backend debe ser una ruta interna.");
  }

  const headers = new Headers(init.headers);
  let accessToken: string = sessionAccessToken;
  // Renovación preventiva contra M1: el access token vence a los 15 min y M6 solo acepta ese token.
  if (canRenew(session) && isNearExpiry(session)) {
    const renewed = await renewRequestSession(request, session, { tolerateUnavailable: true });
    session = renewed;
    accessToken = renewed.accessToken;
  }

  const send = async (token: string) => {
    headers.set("Authorization", `Bearer ${token}`);
    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(resourceUrl, { ...init, headers, signal });
  };
  const finish = (response: Response): Response => {
    const renewed = wasSessionRenewed(request) ? getSessionFromRequest(request) : undefined;
    if (renewed) rememberRenewedResponse(response, renewed, request);
    rememberBffPath(response, new URL(request.url).pathname);
    return response;
  };
  try {
    let response = await send(accessToken);
    // Un 401 con refresh disponible se reintenta UNA vez por pedido. Los bodies de un solo uso (stream, AsyncIterable) no se pueden reenviar.
    const replayable = !(init.body instanceof ReadableStream) && !(typeof init.body === "object" && init.body !== null && Symbol.asyncIterator in init.body);
    if (response.status === 401 && replayable && canRenew(session)) {
      const current = getSessionFromRequest(request);
      const currentToken = current?.accessToken;
      if (currentToken && currentToken !== accessToken) {
        // Otra llamada del mismo pedido (Promise.all) ya renovó: se reintenta con su token, sin renovar de nuevo.
        void response.body?.cancel().catch(() => undefined);
        accessToken = currentToken;
        response = await send(accessToken);
      } else if (!wasSessionRenewed(request)) {
        void response.body?.cancel().catch(() => undefined);
        const renewed = await renewRequestSession(request, session, { tolerateUnavailable: false });
        session = renewed;
        accessToken = renewed.accessToken;
        response = await send(accessToken);
      }
    }
    return finish(await clarifyBackendError(response, init.method ?? "GET"));
  } catch (error) {
    if (init.signal?.aborted) throw error;
    if (error instanceof InvalidSessionError || error instanceof BackendUnavailableError) throw error;
    throw new BackendUnavailableError(503, BACKEND_UNAVAILABLE_MESSAGE);
  }
}
