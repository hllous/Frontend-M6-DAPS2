import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend, pathId } from "./bff-backend";
import { getScenario, type Capability, type OperationalScenario } from "./scenarios";

import { bffPathForResponse } from "./bff-response-path";
import {
  AuthUnavailableError,
  BackendUnavailableError,
  CitizenForbiddenError,
  ForbiddenSessionError,
  AUTH_COOKIE_NAME,
  InvalidSessionError,
  getRequiredSession,
  renewedSessionForResponse,
  requireCapability,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "./session";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export function authorize(
  request: Request,
  options: {
    office?: true;
    officeMessage?: string;
    capability: Capability;
    capabilityMessage?: string;
    fallbackMessage?: string;
    throwOnError: true;
  },
): { session: Session; scenario: OperationalScenario };
export function authorize(
  request: Request,
  options: {
    office?: true;
    officeMessage?: string;
    capability: Capability;
    capabilityMessage?: string;
    fallbackMessage?: string;
    throwOnError?: false;
  },
): { session: Session; scenario: OperationalScenario } | NextResponse;
/** Reuses a session already read by a route while sharing its capability checks. */
export function authorize(
  session: Session,
  options: {
    office?: true;
    officeMessage?: string;
    capability: Capability;
    capabilityMessage?: string;
    fallbackMessage?: string;
    throwOnError: true;
  },
): { session: Session; scenario: OperationalScenario };
export function authorize(
  requestOrSession: Request | Session,
  options: {
    office?: true;
    officeMessage?: string;
    capability: Capability;
    capabilityMessage?: string;
    fallbackMessage?: string;
    throwOnError?: boolean;
  },
): { session: Session; scenario: OperationalScenario } | NextResponse {
  const request = requestOrSession instanceof Request ? requestOrSession : undefined;
  try {
    const session: Session = request ? getRequiredSession(request) : requestOrSession as Session;
    const scenario = getScenario(session);
    if (options.office && scenario.actor.kind !== "OFFICE") {
      throw new ForbiddenSessionError(options.officeMessage ?? "Esta acción requiere una sesión de Oficina.");
    }
    if (options.capabilityMessage && !scenario.capabilities.includes(options.capability)) {
      throw new ForbiddenSessionError(options.capabilityMessage);
    }
    requireCapability(session, options.capability);
    return { session, scenario };
  } catch (error) {
    if (options.throwOnError) throw error;
    if (!request) throw error;
    return mapSessionError(
      error,
      new URL(request.url).pathname,
      options.fallbackMessage ?? "No se pudo autorizar la solicitud.",
    );
  }
}

export function backendQuery<T extends object>(query: T, allowedKeys: readonly string[]): string {
  const params = new URLSearchParams();
  const values = query as Record<string, unknown>;

  for (const key of allowedKeys) {
    const value = values[key];
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

// Scope checks need the ownership fields, not the view adapter's enriched Service.
// Preserve the remaining wire fields so callers can reuse this single read.
const crewScopedServiceSchema = z.object({
  id: z.string(),
  crewId: z.string().nullable().optional(),
}).passthrough();
export type CrewScopedService = z.infer<typeof crewScopedServiceSchema>;

/** Office has no crew restriction; undefined means no scope lookup was necessary. */
export async function requireCrewScope(
  request: Request,
  session: Session,
  { serviceId }: { serviceId: string },
): Promise<CrewScopedService | NextResponse | undefined> {
  const path = new URL(request.url).pathname;
  try {
    const useBackend = backendMode(session);
    const scenario = getScenario(session);
    if (scenario.actor.kind === "OFFICE") return undefined;
    const crewId = useBackend ? session.crew?.id : scenario.actor.crewId;
    if (scenario.actor.kind !== "FIELD" || !crewId) {
      return errorResponse(403, "El servicio no pertenece a la cuadrilla asignada a este usuario.", path, FORBIDDEN_CODES.notAssigned);
    }

    let service: CrewScopedService;
    if (useBackend) {
      const response = await fetchBackend(request, `/services/${pathId(serviceId)}`);
      if (!response.ok) return forwardResponse(response);
      const payload: unknown = await response.json().catch(() => undefined);
      const parsed = crewScopedServiceSchema.safeParse(payload);
      if (!parsed.success) {
        return errorResponse(502, "La respuesta del servicio no respeta el contrato documentado.", path);
      }
      service = parsed.data;
    } else {
      const { serviceFixtures } = await import("./services-fixtures");
      const fixture = serviceFixtures.find((candidate) => candidate.id === serviceId);
      if (!fixture) return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
      service = fixture;
    }
    if (service.crewId !== crewId) {
      return errorResponse(403, "El servicio no pertenece a la cuadrilla asignada a este usuario.", path, FORBIDDEN_CODES.notAssigned);
    }
    return service;
  } catch (error) {
    return mapSessionError(error, path, "No se pudo verificar la cuadrilla del servicio.");
  }
}

export function backendMode(session: Pick<Session, "mode">): boolean {
  if (session.mode === "mock") return false;
  if (!process.env.M6_BACKEND_ORIGIN) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
  }
  return true;
}

/** Códigos estables de un 403 (cuerpo `code`): lo que permite al cliente distinguir una denegación de otra. */
export const FORBIDDEN_CODES = { roleRequired: "ROLE_REQUIRED", notAssigned: "NOT_ASSIGNED" } as const;

export function errorResponse(status: number, message: string, path: string, code?: string): NextResponse {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

export function mapSessionError(error: unknown, path: string, fallbackMessage: string): NextResponse {
  if (error instanceof InvalidSessionError) {
    return errorResponse(401, "La sesión no está activa.", path);
  }
  if (error instanceof CitizenForbiddenError) {
    return errorResponse(403, error.message, path);
  }
  if (error instanceof ForbiddenSessionError) {
    return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
  }
  if (error instanceof AuthUnavailableError) {
    return errorResponse(503, error.message, path);
  }
  if (error instanceof BackendUnavailableError) {
    return errorResponse(503, error.message, path);
  }
  return errorResponse(500, fallbackMessage, path);
}

export function forwardResponse(response: Response, path = bffPathForResponse(response) ?? ""): NextResponse {
  const contentType = response.headers.get("content-type");
  const bodyless = [204, 205, 304].includes(response.status);
  if (!bodyless && contentType !== null && contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    void response.body?.cancel().catch(() => undefined);
    const errorStatus = response.status >= 200 && response.status < 300 ? 502 : response.status;
    const error = errorResponse(errorStatus, "La respuesta del backend no tiene un tipo de contenido JSON válido.", path);
    error.headers.set("X-Content-Type-Options", "nosniff");
    return error;
  }
  const forwarded = new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type": contentType ?? "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
  // Si el pedido renovó los tokens contra M1, la cookie se resella con el material nuevo (no solo se extiende).
  const renewed = renewedSessionForResponse(response);
  if (renewed) forwarded.cookies.set({ name: AUTH_COOKIE_NAME, value: sealSession(renewed), ...sessionCookieOptions(renewed) });
  return forwarded;
}
