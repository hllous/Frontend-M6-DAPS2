import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { rescheduleServiceInputSchema, STATUS_LABEL } from "@/lib/services";
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
    authorize(session, { office: true, officeMessage: "Solo Oficina puede reprogramar un servicio.", capability: "service:reschedule", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = rescheduleServiceInputSchema.safeParse(body);
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
        `/services/${pathId(serviceId)}/reschedule`,
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

    if (service.status !== "SCHEDULED") {
      return errorResponse(
        409,
        `Solo se pueden reprogramar servicios programados (estado actual: ${STATUS_LABEL[service.status]}).`,
        path,
      );
    }

    // zoneIds/routeId are an immutable snapshot: this transition never touches them.
    const updated = updateServiceFixture(service.id, {
      status: "RESCHEDULED",
      statusReason: input.reason,
      history: [
        ...service.history,
        {
          label: "A reprogramar",
          at: new Date().toISOString().slice(0, 16).replace("T", " "),
          done: true,
        },
      ],
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo reprogramar el servicio.");
  }
}
