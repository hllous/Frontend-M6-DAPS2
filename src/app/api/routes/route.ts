import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  addRouteFixture,
  filterRouteFixtures,
  paginateRouteFixtures,
  routeFixtures,
} from "@/lib/routes-fixtures";
import { createRouteInputSchema, type Route, type RouteQuery } from "@/lib/routes";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";





function parseRouteQuery(url: URL): RouteQuery {
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    search: searchParam(url.searchParams),
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const query = parseRouteQuery(new URL(request.url));

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/routes${backendQuery(query, ["active", "zoneId", "search", "page", "pageSize"])}`);
            return forwardResponse(backendResponse);
    }

    return NextResponse.json(paginateRouteFixtures(filterRouteFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudieron cargar los recorridos.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede crear recorridos.", capability: "route:manage", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = createRouteInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/routes", "route:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const existing = routeFixtures.find(
      (candidate) => candidate.code.toLowerCase() === parsed.data.code.toLowerCase(),
    );
    if (existing) {
      return errorResponse(409, `Ya existe un recorrido con el código ${parsed.data.code}.`, path);
    }

    const created: Route = {
      id: `route-${Date.now()}`,
      code: parsed.data.code,
      name: parsed.data.name,
      active: true,
      stops: [], // Nace sin paradas
    };

    addRouteFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo crear el recorrido.");
  }
}
