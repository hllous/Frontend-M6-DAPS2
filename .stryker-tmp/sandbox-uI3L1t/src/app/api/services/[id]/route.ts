// @ts-nocheck
import { findServiceFixture } from "@/lib/bff-service-mock";
import { backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";





export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const serviceId = params.id;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    if (backendMode(session)) {
      const scopedService = await requireCrewScope(request, session, { serviceId });
      if (scopedService instanceof Response) return scopedService;
      if (scopedService) return NextResponse.json(scopedService);
      const backendResponse = await fetchBackend(request, `/services/${pathId(serviceId)}`);
      return forwardResponse(backendResponse);
    }

    const service = findServiceFixture(serviceId, path);
    if (service instanceof Response) return service;

    if (scenario.actor.kind === "FIELD" && scenario.actor.crewId && service.crewId !== scenario.actor.crewId) {
      return errorResponse(403, "El servicio no pertenece a la cuadrilla asignada a este usuario.", path);
    }

    return NextResponse.json(service, { status: 200 });
  } catch (error) {
    return handleRouteError(error, path, "No se pudo cargar el servicio.");
  }
}
