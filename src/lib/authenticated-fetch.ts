import { broadcastLogout } from "./session-client";
import { recordTelemetryEvent } from "./telemetry";

/** Un 403 con `code: ROLE_REQUIRED` avisa que los roles de la sesión pueden estar desactualizados. */
export const ROLES_STALE_EVENT = "m6:roles-stale";

/** Código estable del cuerpo de un 403 (`ROLE_REQUIRED`, `NOT_ASSIGNED`, ...); sin código es un 403 de `sub_type` u otro. */
export async function readForbiddenCode(response: Response): Promise<string | undefined> {
  const body = (await response.clone().json().catch(() => undefined)) as { code?: unknown } | undefined;
  return typeof body?.code === "string" ? body.code : undefined;
}

export class NetworkFailureError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("No se pudo conectar con el servidor. Verifique su conexión.", options);
    this.name = "NetworkFailureError";
  }
}

export async function authenticatedFetch(input: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, { cache: "no-store", ...init });
  } catch (cause) {
    throw new NetworkFailureError({ cause });
  }

  if (response.status === 401) {
    recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
    await broadcastLogout();
  } else if (response.status === 403) {
    recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
    if (input !== "/api/me" && typeof window !== "undefined" && (await readForbiddenCode(response)) === "ROLE_REQUIRED") {
      window.dispatchEvent(new Event(ROLES_STALE_EVENT));
    }
  }

  return response;
}
