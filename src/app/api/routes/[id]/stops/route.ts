import { backendMode, errorResponse, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
  requireCapability,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  getRouteFixture,
  setRouteStopsFixture,
} from "@/lib/routes-fixtures";
import { setRouteStopsInputSchema } from "@/lib/routes";
import { zoneFixtures } from "@/lib/zones-fixtures";





export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    if (scenario.actor.kind !== "OFFICE") {
      throw new ForbiddenSessionError("Solo el rol de Oficina puede editar la secuencia de paradas de recorridos.");
    }
    requireCapability(session, "route:manage");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = setRouteStopsInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/routes/${id}/stops`, "route:manage", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const existingRoute = getRouteFixture(id);
    if (!existingRoute) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }

    // Check if referenced zones exist
    const zoneIds = parsed.data.stops.map((s) => s.zoneId);
    if (zoneIds.length > 0) {
      const missingZones = zoneIds.filter((zid) => !zoneFixtures.some((z) => z.id === zid));
      if (missingZones.length > 0) {
        return errorResponse(404, `Zonas no encontradas: ${missingZones.join(", ")}`, path);
      }
    }

    const updated = setRouteStopsFixture(id, parsed.data.stops);
    if (!updated) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }

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
    return errorResponse(500, "No se pudo actualizar la secuencia de paradas.", path);
  }
}
