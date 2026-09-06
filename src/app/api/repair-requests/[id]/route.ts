import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: status === 404 ? "Not Found" : status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : "Error", timestamp: new Date().toISOString(), path }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    const item = getRepairRequestFixture(id);
    if (scenario.actor.kind === "FIELD") {
      const sourceService = item?.detectedInType === "SERVICE"
        ? serviceFixtures.find((service) => service.id === item.detectedInId)
        : undefined;
      if (!scenario.actor.crewId || !sourceService || sourceService.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "Solo puede consultar derivaciones de Servicios de su cuadrilla.", path);
      }
    } else if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/repair-requests/${id}`);
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }
    return item ? NextResponse.json(item) : errorResponse(404, `Derivación ${id} no encontrada.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar la derivación.", path);
  }
}
