import { NextResponse } from "next/server";

import { loadAuthorizedScenario } from "@/lib/bff-data";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  InvalidSessionError,
} from "@/lib/session";
import { isScenarioId } from "@/lib/scenarios";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
  503: "Service Unavailable",
  500: "Internal Server Error",
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
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudo cargar el escenario.", path);
  }
}
