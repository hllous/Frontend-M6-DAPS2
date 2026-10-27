import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, requireCrewScope } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import {
  STATUS_LABEL,
  suspendServiceRequestSchema,
  toSuspendServiceBackendInput,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";





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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = suspendServiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        parsed.error.issues.map((i) => i.message).join(" "),
        path,
      );
    }

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
    return mapSessionError(error, path, "No se pudo suspender el servicio.");
  }
}
