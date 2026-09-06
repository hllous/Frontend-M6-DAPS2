import { NextResponse } from "next/server";

import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getZoneFixture, getZoneReferences } from "@/lib/zones-fixtures";

const ERROR_LABELS: Record<number, string> = {
  401: "Unauthorized",
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

async function targetId(context: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await context.params;
  return resolved.id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const path = new URL(request.url).pathname;

  try {
    getRequiredSession(request);
    const id = await targetId(context);

    const zone = getZoneFixture(id);
    if (!zone) {
      return errorResponse(404, `Zona operativa ${id} no encontrada.`, path);
    }

    const report = getZoneReferences(id);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudieron verificar las referencias de la zona.", path);
  }
}
