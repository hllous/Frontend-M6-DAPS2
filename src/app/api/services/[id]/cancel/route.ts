import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { cancelServiceInputSchema, STATUS_LABEL } from "@/lib/services";
import { getRequiredSession } from "@/lib/session";
import { versionedService } from "@/lib/bff-mock-versions";





const CANCELLABLE_STATUSES = new Set(["SCHEDULED", "RESCHEDULED", "SUSPENDED"]);

async function handlePOST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    // Permission check: cancellation is an Office decision, not a Field action.
    authorize(session, { office: true, officeMessage: "Solo Oficina puede cancelar un servicio.", capability: "service:cancel", throwOnError: true });

    const parsed = await parseJsonBody(request, cancelServiceInputSchema, path);
    if (parsed instanceof Response) return parsed;

    const input = parsed.data;

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/cancel`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
            return forwardResponse(backendResponse);
    }

    const service = findServiceFixture(serviceId, path);
    if (service instanceof Response) return service;

    if (!CANCELLABLE_STATUSES.has(service.status)) {
      const message =
        service.status === "IN_PROGRESS"
          ? `No se puede cancelar un servicio en curso directamente; debe suspenderse primero.`
          : `Solo se pueden cancelar servicios programados, a reprogramar o suspendidos (estado actual: ${STATUS_LABEL[service.status]}).`;
      return errorResponse(409, message, path);
    }

    // zoneIds/routeId/scheduledDate are left untouched: cancellation never invents a replacement date.
    const updated = updateServiceFixture(service.id, {
      status: "CANCELLED",
      statusReason: input.reason,
      statusNote: null,
      history: [
        ...service.history,
        serviceHistoryEntry("Cancelado"),
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo cancelar el servicio.");
  }
}

export const POST = versionedService(handlePOST);
