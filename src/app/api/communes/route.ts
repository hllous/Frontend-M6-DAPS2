import { NextResponse } from "next/server";

import { backendMode, backendQuery, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { booleanParam } from "@/lib/input-limits";
import { communeFixtures } from "@/lib/neighborhoods-fixtures";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const session = getRequiredSession(request);
    const active = booleanParam(url.searchParams, "active");

    if (backendMode(session)) {
      return forwardResponse(await fetchBackend(request, `/communes${backendQuery({ active }, ["active"])}`));
    }
    return NextResponse.json(communeFixtures(active));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las comunas.");
  }
}
