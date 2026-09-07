import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: status === 404 ? "Not Found" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Error", timestamp: new Date().toISOString(), path }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalReport:view");
    const scenario = getScenario(session.scenarioId);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/environmental-reports/${encodeURIComponent(id)}`, "environmentalReport:view");
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }

    const report = getEnvironmentalReportFixture(id);
    if (!report) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    if (scenario.actor.kind === "FIELD" && report.assignedCrewId !== scenario.actor.crewId) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene acceso al control ambiental.", path);
    return errorResponse(500, "No se pudo cargar el expediente ambiental.", path);
  }
}
