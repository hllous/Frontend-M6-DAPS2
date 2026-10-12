import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import {
  SERVICE_TYPE_CATALOG,
} from "@/lib/services";
import { resolveStreetClosureDependency } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";





export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    // Permission check: only actors with service:execute capability (Crew Leader)
    if (!scenario.capabilities.includes("service:execute")) {
      return errorResponse(
        403,
        "No tiene permisos para iniciar el servicio. Solo la persona responsable de la cuadrilla puede iniciar.",
        path,
      );
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/start`,
        undefined,
        {
          method: "POST",
        },
      );
            return forwardResponse(backendResponse);
    }

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

    const closureDependency = resolveStreetClosureDependency(
      streetClosureRequestFixtures.filter(
        (closureRequest) =>
          closureRequest.sourceType === "SERVICE" && closureRequest.sourceId === serviceId,
      ),
    );
    if (closureDependency.outcome === "blocked") {
      return errorResponse(
        409,
        "No se puede iniciar el Servicio: la solicitud de corte de calle sigue pendiente de respuesta de M7.",
        path,
      );
    }
    if (closureDependency.outcome === "rejected") {
      return errorResponse(
        409,
        "M7 rechazó el corte de calle. Oficina debe elegir explícitamente entre reprogramar o cancelar el Servicio.",
        path,
      );
    }

    // Backend state machine rules:
    if (service.status !== "SCHEDULED") {
      return errorResponse(
        409,
        `Solo se pueden iniciar servicios en estado SCHEDULED (estado actual: ${service.status}).`,
        path,
      );
    }

    if (!service.crewId) {
      return errorResponse(
        409,
        "No se puede iniciar el servicio sin una cuadrilla asignada.",
        path,
      );
    }

    const serviceType = SERVICE_TYPE_CATALOG.find((t) => t.id === service.serviceTypeId);
    if (serviceType?.requiresVehicle && (!service.vehicleId || !service.vehicleId.trim())) {
      return errorResponse(
        409,
        "El tipo de servicio requiere un vehículo operativo asignado para iniciar.",
        path,
      );
    }

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId && service.crewId !== scenario.actor.crewId) {
      return errorResponse(
        403,
        "Solo la cuadrilla asignada al servicio puede registrar su inicio.",
        path,
      );
    }

    const historyEntry = {
      label: "En curso",
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
      done: true,
    };

    const updated = updateServiceFixture(service.id, {
      status: "IN_PROGRESS",
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
    return mapSessionError(error, path, "No se pudo iniciar el servicio.");
  }
}
