import { broadcastLogout } from "./session-client";
import { recordTelemetryEvent } from "./telemetry";

/** Un 403 con `code: ROLE_REQUIRED` avisa que los roles de la sesión pueden estar desactualizados. */
export const ROLES_STALE_EVENT = "m6:roles-stale";

/** Código estable del cuerpo de un 403 (`ROLE_REQUIRED`, `NOT_ASSIGNED`, ...); sin código es un 403 de `sub_type` u otro. */
export async function readForbiddenCode(response: Response): Promise<string | undefined> {
  const body = (await response.clone().json().catch(() => undefined)) as { code?: unknown } | undefined;
  return typeof body?.code === "string" ? body.code : undefined;
}

/** Mensaje claro por `code` de un 403 del backend. */
const FORBIDDEN_MESSAGES: Record<string, string> = {
  ROLE_REQUIRED: "No tiene el rol necesario para realizar esta acción en Ambiente. Solicite acceso a un administrador.",
  NOT_ASSIGNED: "Este servicio no está asignado a su cuadrilla: solo la cuadrilla asignada puede operarlo.",
};

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
    await broadcastLogout({ expired: true });
  } else if (response.status === 403) {
    recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
    const code = await readForbiddenCode(response);
    const message = code ? FORBIDDEN_MESSAGES[code] : undefined;
    if (code && message) {
      if (code === "ROLE_REQUIRED" && input !== "/api/me" && typeof window !== "undefined") {
        window.dispatchEvent(new Event(ROLES_STALE_EVENT));
      }
      const body = await response.json();
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      response = new Response(JSON.stringify({ ...body, message }), { status: 403, headers });
    }
  }

  return response;
}
