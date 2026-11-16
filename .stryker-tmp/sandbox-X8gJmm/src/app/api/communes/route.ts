// @ts-nocheck
import { NextResponse } from "next/server";

import { backendMode, backendQuery, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { booleanParam } from "@/lib/input-limits";
import { communeFixtures } from "@/lib/neighborhoods-fixtures";
import { getRequiredSession } from "@/lib/session";

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
    return handleRouteError(error, path, "No se pudieron cargar las comunas.");
  }
}
