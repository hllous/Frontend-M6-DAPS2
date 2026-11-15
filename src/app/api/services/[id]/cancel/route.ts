import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { cancelServiceInputSchema, STATUS_LABEL } from "@/lib/services";
import { getRequiredSession } from "@/lib/session";





const CANCELLABLE_STATUSES = new Set(["SCHEDULED", "RESCHEDULED", "SUSPENDED"]);

export async function POST(
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

    const service = serviceFixtures.find((s) => s.id === serviceId);
    if (!service) {
      return errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
    }

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
        {
          label: "Cancelado",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo cancelar el servicio.");
  }
}
