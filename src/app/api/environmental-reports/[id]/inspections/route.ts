import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addEnvironmentalInspectionFixture,
  createEnvironmentalInspectionFixture,
  getEnvironmentalReportFixture,
  listEnvironmentalInspectionFixtures,
  updateEnvironmentalInspectionFixture,
  transitionEnvironmentalReportFixture,
} from "@/lib/environmental-report-fixtures";
import { environmentalInspectionScheduleInputSchema, type EnvironmentalInspection } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: status === 409 ? "Conflict" : status === 404 ? "Not Found" : status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : "Error", timestamp: new Date().toISOString(), path }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalInspection:view");
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind === "FIELD") return errorResponse(404, "Historia de inspecciones no encontrada.", path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, "/environmental-reports/" + encodeURIComponent(id) + "/inspections", "environmentalInspection:view");
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    if (!getEnvironmentalReportFixture(id)) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    return NextResponse.json(listEnvironmentalInspectionFixtures(id));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene permiso para consultar inspecciones.", path);
    return errorResponse(500, "No se pudo cargar la historia de inspecciones.", path);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalInspection:schedule");
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede programar inspecciones.", path);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = environmentalInspectionScheduleInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, "/environmental-reports/" + encodeURIComponent(id) + "/inspections", "environmentalInspection:schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const report = getEnvironmentalReportFixture(id);
    if (!report) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    const existing = listEnvironmentalInspectionFixtures(id);
    const active = existing.find((inspection) => !inspection.outcome);
    if (active && report.status === "INSPECTION_SCHEDULED") return NextResponse.json(updateEnvironmentalInspectionFixture(active.id, parsed.data as Partial<EnvironmentalInspection>));
    const isReinspection = report.status === "INSPECTED" && existing.some((inspection) => inspection.outcome === "INCONCLUSIVE");
    if (report.status !== "UNDER_REVIEW" && !isReinspection) return errorResponse(409, "El expediente no está habilitado para programar una inspección.", path);
    const inspection = createEnvironmentalInspectionFixture(id, parsed.data);
    addEnvironmentalInspectionFixture(inspection);
    transitionEnvironmentalReportFixture(id, "INSPECTION_SCHEDULED");
    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene permiso para programar inspecciones.", path);
    return errorResponse(500, "No se pudo programar la inspección.", path);
  }
}
