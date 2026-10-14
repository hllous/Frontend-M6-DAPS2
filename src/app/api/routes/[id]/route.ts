import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  getRouteFixture,
  updateRouteFixture,
} from "@/lib/routes-fixtures";
import { updateRouteInputSchema } from "@/lib/routes";





export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/routes/${pathId(id)}`);
            return forwardResponse(backendResponse);
    }

    const route = getRouteFixture(id);
    if (!route) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }
    return NextResponse.json(route);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo cargar el recorrido.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede editar recorridos.", capability: "route:manage", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = updateRouteInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/routes/${pathId(id)}`, "route:manage", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const updated = updateRouteFixture(id, parsed.data);
    if (!updated) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo editar el recorrido.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede desactivar recorridos.", capability: "route:manage", throwOnError: true });

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/routes/${pathId(id)}`, "route:manage", {
        method: "DELETE",
      });
            return forwardResponse(backendResponse);
    }

    const updated = updateRouteFixture(id, { active: false });
    if (!updated) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo desactivar el recorrido.");
  }
}
