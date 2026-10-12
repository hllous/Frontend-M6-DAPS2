import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { loadAuthorizedScenario } from "@/lib/bff-data";
import {
  AuthUnavailableError,
  BackendUnavailableError,
  ForbiddenSessionError,
  InvalidSessionError,
} from "@/lib/session";
import { isScenarioId } from "@/lib/scenarios";
import { recordTelemetryEvent } from "@/lib/telemetry";





export async function GET(
  request: Request,
  context: { params: Promise<{ scenarioId: string }> },
) {
  const { scenarioId } = await context.params;
  const path = new URL(request.url).pathname;
  if (!isScenarioId(scenarioId)) {
    return NextResponse.json({ message: "Escenario no encontrado." }, { status: 404 });
  }

  try {
    return NextResponse.json(await loadAuthorizedScenario(request, scenarioId));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, "La sesión no puede consultar este escenario.", path);
    }
    if (error instanceof BackendUnavailableError) {
      return errorResponse(error.status, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo cargar el escenario.");
  }
}
