// @ts-nocheck
import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { confirmRescheduleInputSchema, STATUS_LABEL, toConfirmRescheduleBackendInput } from "@/lib/services";
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

    // Permission check: reprogramming is an Office decision, not a Field action.
    authorize(session, { office: true, officeMessage: "Solo Oficina puede confirmar la nueva fecha de un servicio.", capability: "service:reschedule", throwOnError: true });

    const parsed = await parseJsonBody(request, confirmRescheduleInputSchema, path);
    if (parsed instanceof Response) return parsed;

    const input = parsed.data;

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/confirm-reschedule`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toConfirmRescheduleBackendInput(input)),
        },
      );
            return forwardResponse(backendResponse);
    }

    const service = findServiceFixture(serviceId, path);
    if (service instanceof Response) return service;

    if (service.status !== "RESCHEDULED") {
      return errorResponse(
        409,
        `Solo se puede confirmar la nueva fecha de servicios a reprogramar (estado actual: ${STATUS_LABEL[service.status]}).`,
        path,
      );
    }

    // zoneIds/routeId are an immutable snapshot: this transition never touches them,
    // only the date/window that RESCHEDULED left pending.
    const updated = updateServiceFixture(service.id, {
      status: "SCHEDULED",
      statusReason: null,
      scheduledDate: input.scheduledDate,
      windowFrom: input.timeWindow.start,
      windowTo: input.timeWindow.end,
      history: [
        ...service.history,
        serviceHistoryEntry("Programado"),
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo confirmar la reprogramación del servicio.");
  }
}
