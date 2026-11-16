// @ts-nocheck
import { backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getRepairRequestFixture } from "@/lib/repair-request-fixtures";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";



export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    const item = getRepairRequestFixture(id);
    if (scenario.actor.kind === "FIELD") {
      const sourceService = item?.detectedInType === "SERVICE"
        ? serviceFixtures.find((service) => service.id === item.detectedInId)
        : item?.detectedInType === "INSPECTION"
          ? (() => {
              const inspection = getEnvironmentalInspectionFixture(item.detectedInId);
              return inspection?.serviceId
                ? serviceFixtures.find((service) => service.id === inspection.serviceId)
                : undefined;
            })()
          : undefined;
      if (!scenario.actor.crewId || !sourceService || sourceService.crewId !== scenario.actor.crewId) {
        return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
      }
    } else if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/repair-requests/${pathId(id)}`);
      return forwardResponse(backendResponse);
    }
    return item ? NextResponse.json(item) : errorResponse(404, `Derivación ${id} no encontrada.`, path);
  } catch (error) {
    return handleRouteError(error, path, "No se pudo cargar la derivación.");
  }
}
