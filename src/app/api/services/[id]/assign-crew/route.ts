import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { assignCrewFixture } from "@/lib/services-fixtures";
import { assignCrewInputSchema } from "@/lib/services";
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

    // Permission check: crew/vehicle assignment is an Office decision, not a Field action.
    authorize(session, { office: true, officeMessage: "Solo Oficina puede asignar cuadrilla y vehículo a un servicio.", capability: "service:assign", throwOnError: true });

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

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/services/${pathId(serviceId)}/assign-crew`,
        undefined,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
            return forwardResponse(backendResponse);
    }

    const result = assignCrewFixture(serviceId, input);
    if ("status" in result) return errorResponse(result.status, result.message, path);
    return NextResponse.json(result.service, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo asignar la cuadrilla al servicio.");
  }
}
