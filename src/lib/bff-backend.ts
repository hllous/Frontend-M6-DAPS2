import {
  AuthUnavailableError,
  getRequiredSession,
  requireCapability,
} from "./session";
import type { Capability } from "./scenarios";
import { errorResponse } from "./bff-route";

const INVALID_BACKEND_PATH_ID = "\u0000invalid-backend-path-id\u0000";
const BACKEND_PATH_ID_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;

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
): Promise<Response> {
  const session = getRequiredSession(request);
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
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  return fetch(resourceUrl, { ...init, headers });
}
