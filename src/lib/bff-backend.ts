import {
  AuthUnavailableError,
  BackendUnavailableError,
  InvalidSessionError,
  getRequiredSession,
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
const BACKEND_UNAVAILABLE_MESSAGE = "El backend no responde. Reintente en unos segundos.";
export type FetchBackendOptions = {
  timeoutMs?: number;
};

export function pathId(id: string): string {
  if (!BACKEND_PATH_ID_PATTERN.test(id) || id === "." || id === "..") {
    return INVALID_BACKEND_PATH_ID;
  }
  return encodeURIComponent(id);
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
  if (!backendOrigin || !session.accessToken) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
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
  // Renovación preventiva contra M1: el access token vence a los 15 min y M6 solo acepta ese token.
  if (canRenew(session) && isNearExpiry(session)) session = await renewRequestSession(request, session, true);

  const send = async (accessToken: string) => {
    headers.set("Authorization", `Bearer ${accessToken}`);
    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(resourceUrl, { ...init, headers, signal });
  };
  try {
    let response = await send(session.accessToken!);
    // Un 401 con refresh disponible: renovar UNA vez por pedido y reintentar (un body en stream no se puede reenviar).
    if (response.status === 401 && canRenew(session) && !wasSessionRenewed(request) && !(init.body instanceof ReadableStream)) {
      void response.body?.cancel().catch(() => undefined);
      session = await renewRequestSession(request, session, false);
      response = await send(session.accessToken!);
    }
    if (wasSessionRenewed(request)) rememberRenewedResponse(response, session);
    rememberBffPath(response, new URL(request.url).pathname);
    return response;
  } catch (error) {
    if (init.signal?.aborted) throw error;
    if (error instanceof InvalidSessionError || error instanceof BackendUnavailableError) throw error;
    throw new BackendUnavailableError(503, BACKEND_UNAVAILABLE_MESSAGE);
  }
}
