import { authorize, backendMode, errorResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { environmentalInspectionSchema } from "@/lib/environmental-reports";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import { withInspectionAttachments } from "../_attachments";
import { AuthUnavailableError, BackendUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";

function projectFieldInspection(inspection: Record<string, unknown>) {
  const projected = { ...inspection };
  delete projected.inspectorId;
  delete projected.reporterSnapshot;
  delete projected.violationNotice;
  return projected;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "environmentalInspection:view", throwOnError: true });
    const scenario = getScenario(session);
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/environmental-inspections/" + pathId(id), "environmentalInspection:view");
      if (!backendResponse.ok) return withInspectionAttachments(request, backendResponse);
      let payload: unknown;
      try { payload = await backendResponse.json(); } catch {
        return errorResponse(502, "La respuesta del backend no contiene una inspección válida.", path);
      }
      const parsed = environmentalInspectionSchema.safeParse(payload);
      if (!parsed.success) return errorResponse(502, "La respuesta del backend no contiene una inspección válida.", path);
      let inspection: Record<string, unknown> = parsed.data;
      if (scenario.actor.kind === "FIELD") {
        if (!parsed.data.serviceId || !session.crew?.id) return errorResponse(404, "Inspección no encontrada.", path);
        const serviceResponse = await fetchBackend(request, `/services/${pathId(parsed.data.serviceId)}`);
        if (!serviceResponse.ok) return withInspectionAttachments(request, serviceResponse);
        const service: unknown = await serviceResponse.json();
        if (!service || typeof service !== "object" || !("crewId" in service) || service.crewId !== session.crew.id) {
          return errorResponse(404, "Inspección no encontrada.", path);
        }
        inspection = projectFieldInspection(inspection);
      }
      return withInspectionAttachments(request, new Response(JSON.stringify(inspection), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      }));
    }
    const inspection = getEnvironmentalInspectionFixture(id);
    if (!inspection) return errorResponse(404, "Inspección no encontrada.", path);
    if (scenario.actor.kind === "FIELD") {
      const service = inspection.serviceId ? serviceFixtures.find((candidate) => candidate.id === inspection.serviceId) : null;
      if (!service || service.crewId !== scenario.actor.crewId) return errorResponse(404, "Inspección no encontrada.", path);
      return NextResponse.json(projectFieldInspection(inspection));
    }
    return NextResponse.json(inspection);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof BackendUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene permiso para consultar inspecciones.", path, FORBIDDEN_CODES.roleRequired);
    return errorResponse(500, "No se pudo cargar la inspección.", path);
  }
}
