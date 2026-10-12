import { backendMode, errorResponse, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
  requireCapability,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getZoneFixture, removeNeighborhoodFixture } from "@/lib/zones-fixtures";




export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; neighborhoodId: string }> },
) {
  const { id, neighborhoodId } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    if (scenario.actor.kind !== "OFFICE") {
      throw new ForbiddenSessionError("Solo el rol de Oficina puede quitar barrios de una zona operativa.");
    }
    requireCapability(session, "zone:manage");

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(
        request,
        `/zones/${pathId(id)}/neighborhoods/${pathId(neighborhoodId)}`,
        "zone:manage",
        { method: "DELETE" },
      );
            return forwardResponse(backendResponse);
    }

    const zone = getZoneFixture(id);
    if (!zone) {
      return errorResponse(404, "Zona operativa no encontrada.", path);
    }
    if (!zone.neighborhoodIds?.includes(neighborhoodId)) {
      return errorResponse(404, "El barrio no está asignado a la zona operativa.", path);
    }

    const updated = removeNeighborhoodFixture(id, neighborhoodId);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo quitar el barrio de la zona operativa.", path);
  }
}
