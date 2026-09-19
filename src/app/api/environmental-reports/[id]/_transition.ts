import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getEnvironmentalReportFixture, transitionEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

export async function transitionReport(request: Request, id: string, action: "start-review" | "forward" | "dismiss" | "close") {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    requireCapability(session, action === "close" ? "environmentalReport:close" : "environmentalReport:review");
    if (scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede revisar expedientes ambientales.", path);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/environmental-reports/${encodeURIComponent(id)}/${action}`, action === "close" ? "environmentalReport:close" : "environmentalReport:review", { method: "POST" });
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }

    const current = getEnvironmentalReportFixture(id);
    if (!current) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    const target = action === "start-review" ? "UNDER_REVIEW" : action === "forward" ? "FORWARDED" : action === "dismiss" ? "DISMISSED" : "CLOSED";
    const valid = action === "start-review" ? current.status === "RECEIVED" : action === "forward" || action === "dismiss" ? current.status === "UNDER_REVIEW" : ["FORWARDED", "DISMISSED", "NO_VIOLATION", "SANCTIONED"].includes(current.status);
    if (!valid) return errorResponse(409, `La transición no es válida para el estado actual: ${current.status}.`, path);
    return NextResponse.json(transitionEnvironmentalReportFixture(id, target));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene permiso para revisar este expediente.", path);
    return errorResponse(500, "No se pudo actualizar el expediente ambiental.", path);
  }
}
