// @ts-nocheck
import { NextResponse } from "next/server";

import { backendMode, backendQuery, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { filterNeighborhoodFixtures } from "@/lib/neighborhoods-fixtures";
import { booleanParam, MAX_SEARCH_LENGTH } from "@/lib/input-limits";
import { getRequiredSession } from "@/lib/session";

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
    return handleRouteError(error, path, "No se pudieron cargar los barrios.");
  }
}
