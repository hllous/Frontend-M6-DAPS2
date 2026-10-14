import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { environmentalReportSchema } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";



export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "environmentalReport:view", throwOnError: true });
    const scenario = getScenario(session.scenarioId);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/environmental-reports/${pathId(id)}`, "environmentalReport:view");
      if (scenario.actor.kind === "FIELD" && backendResponse.ok) {
        let payload: unknown;
        try { payload = await backendResponse.json(); } catch {
          return errorResponse(502, "La respuesta del expediente ambiental no contiene JSON válido.", path);
        }
        const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload)
          ? (payload as { data: unknown }).data
          : payload;
        const parsed = environmentalReportSchema.safeParse(raw);
        if (!parsed.success) return errorResponse(502, "La respuesta del expediente ambiental no respeta el contrato documentado.", path);
        if (!session.crew?.id || parsed.data.assignedCrewId !== session.crew.id) {
          return errorResponse(404, "Expediente ambiental no encontrado.", path);
        }
        return NextResponse.json(parsed.data);
      }
      return forwardResponse(backendResponse);
    }

    const report = getEnvironmentalReportFixture(id);
    if (!report) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    if (scenario.actor.kind === "FIELD" && report.assignedCrewId !== scenario.actor.crewId) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene acceso al control ambiental.", path);
    return mapSessionError(error, path, "No se pudo cargar el expediente ambiental.");
  }
}
