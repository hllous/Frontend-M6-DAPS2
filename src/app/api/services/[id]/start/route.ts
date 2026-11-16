import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import {
  SERVICE_TYPE_CATALOG,
} from "@/lib/services";
import { resolveStreetClosureDependency } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
import { versionedService } from "@/lib/bff-mock-versions";





async function handlePOST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    // Permission check: only actors with service:execute capability (Crew Leader)
    authorize(session, { capability: "service:execute", capabilityMessage: "No tiene permisos para iniciar el servicio. Solo la persona responsable de la cuadrilla puede iniciar.", throwOnError: true });

    if (backendMode(session)) {
      const scopedService = await requireCrewScope(request, session, { serviceId });
      if (scopedService instanceof Response) return scopedService;
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

    const service = findServiceFixture(serviceId, path);
    if (service instanceof Response) return service;

    const closureDependency = resolveStreetClosureDependency(
      streetClosureRequestFixtures.filter(
        (closureRequest) =>
          closureRequest.sourceType === "SERVICE" && closureRequest.sourceId === serviceId,
      ),
    );
    if (closureDependency.outcome === "blocked") {
      return errorResponse(
        409,
        "No se puede iniciar el Servicio: la solicitud de corte de calle sigue pendiente de respuesta de Tránsito.",
        path,
      );
    }
    if (closureDependency.outcome === "rejected") {
      return errorResponse(
        409,
        "Tránsito rechazó el corte de calle. Oficina debe elegir explícitamente entre reprogramar o cancelar el Servicio.",
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

    const historyEntry = serviceHistoryEntry("En curso");

    const updated = updateServiceFixture(service.id, {
      status: "IN_PROGRESS",
      history: [...service.history, historyEntry],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo iniciar el servicio.");
  }
}

export const POST = versionedService(handlePOST);
