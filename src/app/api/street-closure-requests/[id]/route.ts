import { backendMode, errorResponse, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getStreetClosureRequestFixture } from "@/lib/street-closure-request-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";





export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede consultar solicitudes de corte de calle.", path);
    }
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/street-closure-requests/${id}`);
      return forwardResponse(backendResponse);
    }
    const requestFixture = getStreetClosureRequestFixture(id);
    return requestFixture
      ? NextResponse.json(requestFixture)
      : errorResponse(404, `Solicitud de corte de calle ${id} no encontrada.`, path);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar la solicitud de corte de calle.", path);
  }
}
