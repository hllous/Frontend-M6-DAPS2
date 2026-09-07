import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  getEnvironmentalInspectionFixture,
  transitionEnvironmentalReportFixture,
  updateEnvironmentalInspectionFixture,
} from "@/lib/environmental-report-fixtures";
import { environmentalInspectionCompleteInputSchema } from "@/lib/environmental-reports";
import { serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

function nextStepForOutcome(outcome: "NO_VIOLATION" | "VIOLATION_FOUND" | "INCONCLUSIVE") {
  if (outcome === "NO_VIOLATION") return "CASE_CLOSED" as const;
  if (outcome === "VIOLATION_FOUND") return "NOTICE_TO_BE_ISSUED" as const;
  return "REINSPECTION" as const;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (!scenario.capabilities.includes("environmentalInspection:execute")) {
      return errorResponse(403, "Solo la persona responsable de la cuadrilla puede completar la inspecciÃ³n.", path);
    }

    const requestBody = await request.text();
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud debe ser un JSON vÃ¡lido.", path);
    }
    const parsedInput = environmentalInspectionCompleteInputSchema.safeParse(parsedBody);
    if (!parsedInput.success) {
      return errorResponse(400, parsedInput.error.issues.map((issue) => issue.message).join(" "), path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        `/environmental-inspections/${encodeURIComponent(id)}/complete`,
        "environmentalInspection:execute",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsedInput.data),
        },
      );
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const inspection = getEnvironmentalInspectionFixture(id);
    if (!inspection) return errorResponse(404, "InspecciÃ³n no encontrada.", path);
    const service = inspection.serviceId ? serviceFixtures.find((candidate) => candidate.id === inspection.serviceId) : null;
    if (!service) return errorResponse(409, "La inspecciÃ³n no tiene un servicio operativo vinculado.", path);
    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId && service.crewId !== scenario.actor.crewId) {
      return errorResponse(403, "Solo la cuadrilla asignada puede completar esta inspecciÃ³n.", path);
    }
    if (service.status !== "IN_PROGRESS") {
      return errorResponse(409, `La inspecciÃ³n solo puede completarse con el servicio en curso (estado actual: ${service.status}).`, path);
    }
    if (parsedInput.data.outcome !== "NO_VIOLATION" && !(inspection.attachments?.length ?? 0)) {
      return errorResponse(400, "Debe adjuntar al menos una evidencia para este resultado.", path);
    }
    const expectedChecklistIds = new Set(inspection.checklist.map((item) => item.id));
    if (parsedInput.data.checklist.length !== expectedChecklistIds.size || parsedInput.data.checklist.some((item) => !expectedChecklistIds.has(item.id))) {
      return errorResponse(400, "El checklist enviado no coincide con el checklist asignado.", path);
    }

    const updatedInspection = updateEnvironmentalInspectionFixture(id, {
      inspectedAt: new Date().toISOString(),
      checklist: inspection.checklist,
      findings: parsedInput.data.findings ?? null,
      violationType: parsedInput.data.violationType ?? null,
      severity: parsedInput.data.severity ?? null,
      suggestedAction: parsedInput.data.suggestedAction ?? null,
      notes: parsedInput.data.conclusion ?? inspection.notes,
      outcome: parsedInput.data.outcome,
      nextStep: nextStepForOutcome(parsedInput.data.outcome),
    });
    if (!updatedInspection) return errorResponse(404, "InspecciÃ³n no encontrada.", path);

    transitionEnvironmentalReportFixture(
      inspection.reportId,
      parsedInput.data.outcome === "NO_VIOLATION"
        ? "NO_VIOLATION"
        : parsedInput.data.outcome === "VIOLATION_FOUND"
          ? "VIOLATION_FOUND"
          : "INSPECTED",
    );
    updateServiceFixture(service.id, {
      status: "COMPLETED",
      statusReason: null,
      history: [...service.history, { label: "Completado", at: new Date().toISOString().slice(0, 16).replace("T", " "), done: true }],
    });

    return NextResponse.json(updatedInspection, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesiÃ³n no estÃ¡ activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo completar la inspecciÃ³n.", path);
  }
}
