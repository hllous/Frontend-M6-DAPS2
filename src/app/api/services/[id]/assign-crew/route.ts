import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import {
  assignCrewInputSchema,
  CREW_CATALOG,
  SERVICE_TYPE_CATALOG,
  VEHICLE_CATALOG,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
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

    // Permission check: crew/vehicle assignment is an Office decision, not a Field action.
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede asignar cuadrilla y vehículo a un servicio.", path);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = assignCrewInputSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(" ");
      return errorResponse(400, message, path);
    }

    const input = parsed.data;

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${serviceId}/assign-crew`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
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

    const serviceType = SERVICE_TYPE_CATALOG.find((t) => t.id === service.serviceTypeId);
    if (serviceType?.requiresVehicle && (!input.vehicleId || !input.vehicleId.trim())) {
      return errorResponse(
        400,
        "El tipo de servicio requiere la asignación obligatoria de un vehículo operativo.",
        path,
      );
    }

    const crew = CREW_CATALOG.find((c) => c.id === input.crewId);
    const vehicle = input.vehicleId
      ? VEHICLE_CATALOG.find((v) => v.id === input.vehicleId)
      : null;

    const historyEntry = {
      label: "Asignado",
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
      done: true,
    };

    const updated = updateServiceFixture(service.id, {
      crewId: input.crewId,
      crewName: crew?.name ?? input.crewId,
      vehicleId: input.vehicleId ?? null,
      vehiclePlate: vehicle?.plate ?? null,
      history: [...service.history, historyEntry],
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
    return errorResponse(500, "No se pudo asignar la cuadrilla al servicio.", path);
  }
}
