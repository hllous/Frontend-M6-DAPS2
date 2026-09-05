import { broadcastLogout } from "./session-client";
import { recordTelemetryEvent } from "./telemetry";

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
  }

  return response;
}
