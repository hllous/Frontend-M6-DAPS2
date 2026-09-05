import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  getZoneResultsByServiceId,
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import type { ServiceStatus } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
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

    if (!scenario.capabilities.includes("service:execute")) {
      return errorResponse(
        403,
        "No tiene permisos para completar el servicio. Solo la persona responsable de la cuadrilla puede hacerlo.",
        path,
      );
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${serviceId}/complete`,
        undefined,
        {
          method: "POST",
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

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId) {
      if (service.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "No tiene permisos para completar servicios de otra cuadrilla.", path);
      }
    }

    if (service.status !== "IN_PROGRESS") {
      return errorResponse(
        409,
        `Solo se pueden completar servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`,
        path,
      );
    }

    const results = getZoneResultsByServiceId(serviceId);
    const missingZones = service.zoneIds.filter((zid) => !results.some((r) => r.zoneId === zid));
    if (missingZones.length > 0) {
      return errorResponse(
        409,
        `Falta registrar el resultado de ${missingZones.length} zona(s) del servicio antes de completar.`,
        path,
      );
    }

    // Backend-computed completion rollup
    const allServiced = results.every((r) => r.status === "SERVICED");
    const computedStatus: ServiceStatus = allServiced ? "COMPLETED" : "PARTIALLY_COMPLETED";
    const historyLabel = computedStatus === "COMPLETED" ? "Completado" : "Parcial";

    const nonServicedNotes = results
      .filter((r) => r.status !== "SERVICED" && r.notes)
      .map((r) => r.notes)
      .join(" · ");

    const updated = updateServiceFixture(service.id, {
      status: computedStatus,
      statusReason: computedStatus === "PARTIALLY_COMPLETED"
        ? (nonServicedNotes || "Cierre parcial con zonas no atendidas o parciales")
        : null,
      history: [
        ...service.history,
        {
          label: historyLabel,
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return errorResponse(500, "Error interno del servidor.", path);
  }
}
