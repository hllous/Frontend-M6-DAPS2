import {
  AuthUnavailableError,
  getRequiredSession,
  requireCapability,
} from "./session";
import type { Capability } from "./scenarios";

export async function fetchBackend(
  request: Request,
  resourcePath: string,
  capability: Capability,
  init: RequestInit = {},
): Promise<Response> {
  const session = getRequiredSession(request);
  requireCapability(session, capability);

  if (session.mode === "mock") {
    throw new AuthUnavailableError("El modo mock no realiza llamadas al backend.");
  }

  const backendOrigin = process.env.M6_BACKEND_ORIGIN;
  if (!backendOrigin || !session.accessToken) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
  }

  const backendUrl = new URL(backendOrigin);
  const resourceUrl = new URL(resourcePath, backendUrl);
  if (!resourcePath.startsWith("/") || resourceUrl.origin !== backendUrl.origin) {
    throw new AuthUnavailableError("El recurso backend debe ser una ruta interna.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  return fetch(resourceUrl, { ...init, headers });
}
