import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import {
  NOT_SERVICED_REASON_LABEL,
  suspendServiceInputSchema,
} from "@/lib/services";
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

    // Permission check: only actors with service:execute capability (Crew Leader of the assigned crew)
    if (!scenario.capabilities.includes("service:execute")) {
      return errorResponse(
        403,
        "No tiene permisos para suspender el servicio. Solo la persona responsable de la cuadrilla puede hacerlo.",
        path,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = suspendServiceInputSchema.safeParse(body);
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
        `/services/${serviceId}/suspend`,
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

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId && service.crewId !== scenario.actor.crewId) {
      return errorResponse(403, "Solo la cuadrilla asignada al servicio puede suspenderlo.", path);
    }

    if (service.status !== "IN_PROGRESS") {
      return errorResponse(
        409,
        `Solo se pueden suspender servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
        path,
      );
    }

    const statusReason = `${NOT_SERVICED_REASON_LABEL[input.reason]}: ${input.note}`;

    const updated = updateServiceFixture(service.id, {
      status: "SUSPENDED",
      statusReason,
      history: [
        ...service.history,
        {
          label: "Suspendido",
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
    return errorResponse(500, "No se pudo suspender el servicio.", path);
  }
}
