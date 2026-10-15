import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";




export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const { id } = await context.params;
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/tree-interventions/${pathId(id)}`);
      return forwardResponse(response);
    }
    const intervention = getTreeInterventionFixture(id);
    return intervention ? NextResponse.json(intervention) : errorResponse(404, "Intervención de arbolado no encontrada.", path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar el detalle de la intervención.");
  }
}
