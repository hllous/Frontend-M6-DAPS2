import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  updateServiceFixture,
} from "@/lib/services-fixtures";
import {
  STATUS_LABEL,
  suspendServiceRequestSchema,
  toSuspendServiceBackendInput,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";





export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    // Permission check: only actors with service:execute capability (Crew Leader of the assigned crew)
    authorize(session, { capability: "service:execute", capabilityMessage: "No tiene permisos para suspender el servicio. Solo la persona responsable de la cuadrilla puede hacerlo.", throwOnError: true });

    const parsed = await parseJsonBody(request, suspendServiceRequestSchema, path);
    if (parsed instanceof Response) return parsed;

    const input = parsed.data;

    if (backendMode(session)) {
      const scopedService = await requireCrewScope(request, session, { serviceId });
      if (scopedService instanceof Response) return scopedService;
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/suspend`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toSuspendServiceBackendInput(input)),
        },
      );
            return forwardResponse(backendResponse);
    }

    const service = findServiceFixture(serviceId, path);
    if (service instanceof Response) return service;

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId && service.crewId !== scenario.actor.crewId) {
      return errorResponse(403, "Solo la cuadrilla asignada al servicio puede suspenderlo.", path);
    }

    if (service.status !== "IN_PROGRESS") {
      return errorResponse(
        409,
        `Solo se pueden suspender servicios en curso (estado actual: ${STATUS_LABEL[service.status]}).`,
        path,
      );
    }

    const { reason: statusReason, note: statusNote } = toSuspendServiceBackendInput(input);

    const updated = updateServiceFixture(service.id, {
      status: "SUSPENDED",
      statusReason,
      statusNote: statusNote ?? null,
      history: [
        ...service.history,
        serviceHistoryEntry("Suspendido"),
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo suspender el servicio.");
  }
}
