import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeSurveyFixture } from "@/lib/tree-survey-fixtures";
import { getRequiredSession, InvalidSessionError, AuthUnavailableError } from "@/lib/session";




export async function GET(request: Request, context: { params: Promise<{ id: string; surveyId: string }> | { id: string; surveyId: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const { id, surveyId } = await context.params;
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/trees/${pathId(id)}/surveys/${pathId(surveyId)}`);
      return forwardResponse(response);
    }
    const survey = getTreeSurveyFixture(id, surveyId);
    return survey ? NextResponse.json(survey) : errorResponse(404, "Relevamiento no encontrado.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar el detalle del relevamiento.");
  }
}
