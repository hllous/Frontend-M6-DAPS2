import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { cancelServiceInputSchema } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

const CANCELLABLE_STATUSES = new Set(["SCHEDULED", "RESCHEDULED", "SUSPENDED"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

    // Permission check: cancellation is an Office decision, not a Field action.
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede cancelar un servicio.", path);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = cancelServiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        parsed.error.issues.map((i) => i.message).join(" "),
        path,
      );
    }

    const input = parsed.data;

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${serviceId}/cancel`,
        undefined,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

    if (!CANCELLABLE_STATUSES.has(service.status)) {
      const message =
        service.status === "IN_PROGRESS"
          ? `No se puede cancelar un servicio en curso (IN_PROGRESS) directamente; debe suspenderse primero.`
          : `Solo se pueden cancelar servicios programados (SCHEDULED), a reprogramar (RESCHEDULED) o suspendidos (SUSPENDED) (estado actual: ${service.status}).`;
      return errorResponse(409, message, path);
    }

    // zoneIds/routeId/scheduledDate are left untouched: cancellation never invents a replacement date.
    const updated = updateServiceFixture(service.id, {
      status: "CANCELLED",
      statusReason: input.reason,
      history: [
        ...service.history,
        {
          label: "Cancelado",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo cancelar el servicio.", path);
  }
}
