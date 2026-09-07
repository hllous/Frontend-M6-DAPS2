import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getTreeSurveyFixture } from "@/lib/tree-survey-fixtures";
import { getRequiredSession, InvalidSessionError, AuthUnavailableError } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 401: "Unauthorized", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }

export async function GET(request: Request, context: { params: Promise<{ id: string; surveyId: string }> | { id: string; surveyId: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const { id, surveyId } = await context.params;
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/trees/${id}/surveys/${surveyId}`);
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const survey = getTreeSurveyFixture(id, surveyId);
    return survey ? NextResponse.json(survey) : errorResponse(404, "Relevamiento no encontrado.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar el detalle del relevamiento.", path);
  }
}
