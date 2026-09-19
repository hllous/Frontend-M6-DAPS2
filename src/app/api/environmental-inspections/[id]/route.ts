import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

function response(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: status === 404 ? "Not Found" : status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : status === 503 ? "Service Unavailable" : "Error", path }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalInspection:view");
    const scenario = getScenario(session.scenarioId);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/environmental-inspections/" + encodeURIComponent(id), "environmentalInspection:view");
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }
    const inspection = getEnvironmentalInspectionFixture(id);
    if (!inspection) return response(404, "Inspección no encontrada.", path);
    if (scenario.actor.kind === "FIELD") {
      const service = inspection.serviceId ? serviceFixtures.find((candidate) => candidate.id === inspection.serviceId) : null;
      if (!service || service.crewId !== scenario.actor.crewId) return response(404, "Inspección no encontrada.", path);
      const fieldInspection = { ...inspection } as Record<string, unknown>;
      delete fieldInspection.inspectorId;
      delete fieldInspection.reporterSnapshot;
      delete fieldInspection.violationNotice;
      return NextResponse.json(fieldInspection);
    }
    return NextResponse.json(inspection);
  } catch (error) {
    if (error instanceof InvalidSessionError) return response(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return response(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return response(403, "La sesión no tiene permiso para consultar inspecciones.", path);
    return response(500, "No se pudo cargar la inspección.", path);
  }
}
