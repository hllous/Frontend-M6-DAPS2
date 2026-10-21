import { NextResponse } from "next/server";

import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalReportFixture, updateEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { requestInformationInputSchema } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";

const CAPABILITY = "environmentalReport:review";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: CAPABILITY, throwOnError: true });
    if (getScenario(session.scenarioId).actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina puede pedir información al vecino.", path);

    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = requestInformationInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
      return forwardResponse(await fetchBackend(request, `/environmental-reports/${pathId(id)}/request-information`, CAPABILITY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      }));
    }

    const current = getEnvironmentalReportFixture(id);
    if (!current) return errorResponse(404, "Expediente ambiental no encontrado.", path);
    if (current.status !== "UNDER_REVIEW" || !current.ticketId) return errorResponse(409, "Solo se puede pedir información en un expediente en revisión con reclamo de M2.", path);
    if (current.informationRequestPending) return errorResponse(409, "Ya hay una solicitud de información pendiente.", path);
    return NextResponse.json(updateEnvironmentalReportFixture(id, {
      informationRequestPending: true,
      informationRequestedAt: new Date().toISOString(),
      informationRequestMessage: parsed.data.message,
      informationRequestRequiredBy: parsed.data.requiredBy ? `${parsed.data.requiredBy}T23:59:59-03:00` : null,
    }));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene permiso para pedir información.", path);
    return mapSessionError(error, path, "No se pudo pedir la información al vecino.");
  }
}
