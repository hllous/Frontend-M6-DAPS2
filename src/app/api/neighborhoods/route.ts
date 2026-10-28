import { NextResponse } from "next/server";

import { backendMode, backendQuery, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { filterNeighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { booleanParam, MAX_SEARCH_LENGTH } from "@/lib/input-limits";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

/** Catálogo de barrios de M9, leído por el backend de M6 (cacheado). El BFF no llama al Core ni tiene su token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const session = getRequiredSession(request);
    const query = {
      soloActivos: booleanParam(url.searchParams, "soloActivos"),
      zona: url.searchParams.get("zona")?.slice(0, MAX_SEARCH_LENGTH) || undefined,
      q: url.searchParams.get("q")?.slice(0, MAX_SEARCH_LENGTH),
    };

    if (backendMode(session)) {
      return forwardResponse(await fetchBackend(request, `/neighborhoods${backendQuery(query, ["soloActivos", "zona", "q"])}`));
    }
    return NextResponse.json(filterNeighborhoodFixtures(query));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los barrios.");
  }
}
