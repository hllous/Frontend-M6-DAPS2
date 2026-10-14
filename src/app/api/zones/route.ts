import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  addZoneFixture,
  filterZoneFixtures,
  paginateZoneFixtures,
  zoneFixtures,
} from "@/lib/zones-fixtures";
import { createZoneInputSchema, type Zone, type ZoneQuery } from "@/lib/zones";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";





function parseZoneQuery(url: URL): ZoneQuery {
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    search: searchParam(url.searchParams),
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const query = parseZoneQuery(new URL(request.url));

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/zones${backendQuery(query, ["active", "search", "page", "pageSize"])}`);
            return forwardResponse(backendResponse);
    }

    return NextResponse.json(paginateZoneFixtures(filterZoneFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudieron cargar las zonas.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    authorize(session, { office: true, officeMessage: "Solo el rol de Oficina puede crear zonas operativas.", capability: "zone:manage", throwOnError: true });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = createZoneInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/zones", "zone:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return forwardResponse(backendResponse);
    }

    const existing = zoneFixtures.find(
      (candidate) => candidate.code.toLowerCase() === parsed.data.code.toLowerCase(),
    );
    if (existing) {
      return errorResponse(
        409,
        `Ya existe una zona operativa con el código ${parsed.data.code}.`,
        path,
      );
    }

    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      code: parsed.data.code,
      name: parsed.data.name,
      active: true,
      neighborhoodIds: [],
    };
    addZoneFixture(newZone);

    return NextResponse.json(newZone, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) {
      recordTelemetryEvent({ name: "auth_forbidden", status: 403 });
      return errorResponse(403, error.message, path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return mapSessionError(error, path, "No se pudo crear la zona operativa.");
  }
}

