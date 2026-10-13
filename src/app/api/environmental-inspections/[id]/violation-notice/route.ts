import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import {
  addViolationNoticeFixture,
  createViolationNoticeFixture,
  getEnvironmentalInspectionFixture,
  getEnvironmentalReportFixture,
  getViolationNoticeFixture,
  transitionEnvironmentalReportFixture,
} from "@/lib/environmental-report-fixtures";
import { issueViolationNoticeInputSchema } from "@/lib/environmental-reports";
import { establishmentDirectoryAdapter } from "@/lib/establishment-directory";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";





type NoticeContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(request: Request, context: NoticeContext) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    requireCapability(session, "violationNotice:view");
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede consultar actas de infracción.", path);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/environmental-inspections/${pathId(id)}/violation-notice`, "violationNotice:view");
      return forwardResponse(backendResponse);
    }

    const notice = getViolationNoticeFixture(id);
    return notice
      ? NextResponse.json(notice)
      : errorResponse(404, "La inspección no tiene un acta emitida.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene permiso para consultar actas.", path);
    return mapSessionError(error, path, "No se pudo consultar el acta de infracción.");
  }
}

export async function POST(request: Request, context: NoticeContext) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    requireCapability(session, "violationNotice:issue");
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede emitir actas de infracción.", path);

    const body = await request.json().catch(() => undefined);
    const parsedInput = issueViolationNoticeInputSchema.safeParse(body);
    if (!parsedInput.success) return errorResponse(400, parsedInput.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/environmental-inspections/${pathId(id)}/violation-notice`, "violationNotice:issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      });
      return forwardResponse(backendResponse);
    }

    const inspection = getEnvironmentalInspectionFixture(id);
    if (!inspection) return errorResponse(404, "Inspección no encontrada.", path);
    if (inspection.outcome !== "VIOLATION_FOUND") return errorResponse(409, "Solo se puede emitir un acta sobre una inspección completada con infracción constatada.", path);
    if (!(inspection.attachments?.length ?? 0)) return errorResponse(400, "Debe adjuntar al menos una evidencia a la inspección antes de emitir el acta.", path);
    if (getViolationNoticeFixture(id)) return errorResponse(409, "La inspección ya tiene un acta emitida. Las correcciones requieren una nueva inspección.", path);
    if (!getEnvironmentalReportFixture(inspection.reportId)) return errorResponse(404, "Expediente ambiental no encontrado.", path);

    if (parsedInput.data.establishmentId) {
      const establishment = await establishmentDirectoryAdapter.resolve({ query: parsedInput.data.establishmentId });
      if (!establishment || establishment.id !== parsedInput.data.establishmentId) {
        return errorResponse(400, "El establecimiento indicado no existe en el directorio local.", path);
      }
    }

    const notice = createViolationNoticeFixture(id, parsedInput.data);
    addViolationNoticeFixture(notice);
    transitionEnvironmentalReportFixture(inspection.reportId, notice.establishmentId ? "NOTICE_ISSUED" : "CLOSED");
    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene permiso para emitir actas.", path);
    return mapSessionError(error, path, "No se pudo emitir el acta de infracción.");
  }
}
