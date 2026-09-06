import { NextResponse } from "next/server";

import {
  AuthUnavailableError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getRouteFixture, getRouteReferences } from "@/lib/routes-fixtures";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
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
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    getRequiredSession(request);

    const route = getRouteFixture(id);
    if (!route) {
      return errorResponse(404, "Recorrido no encontrado.", path);
    }

    const report = getRouteReferences(id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudieron obtener las referencias del recorrido.", path);
  }
}
