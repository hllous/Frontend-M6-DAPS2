import { backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addContainerFixture,
  filterContainerFixtures,
  containerFixtures,
  paginateContainerFixtures,
} from "@/lib/containers-fixtures";
import {
  createContainerInputSchema,
  containerStatusSchema,
  containerTypeSchema,
  type Container,
  type ContainerQuery,
} from "@/lib/containers";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";





function parseContainerQuery(url: URL): ContainerQuery {
  const rawStatus = url.searchParams.get("status");
  const rawType = url.searchParams.get("containerType");
  return {
    status: containerStatusSchema.safeParse(rawStatus).success
      ? (rawStatus as ContainerQuery["status"])
      : undefined,
    containerType: containerTypeSchema.safeParse(rawType).success
      ? (rawType as ContainerQuery["containerType"])
      : undefined,
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
    const query = parseContainerQuery(new URL(request.url));

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/containers${backendQuery(query, ["status", "containerType", "zoneId", "search", "page", "pageSize"])}`);
            return forwardResponse(backendResponse);
    }

    return NextResponse.json(
      paginateContainerFixtures(filterContainerFixtures(query), query.page, query.pageSize),
    );
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los contenedores.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    // Permission check: mirror cancel/route.ts inline actor-kind check
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo el rol de Oficina puede gestionar contenedores.", path);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }

    const parsed = createContainerInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((i) => i.message).join(" "), path);
    }

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/containers", "container:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
            return forwardResponse(backendResponse);
    }

    const existing = containerFixtures.find(
      (c) => c.code.toLowerCase() === parsed.data.code.toLowerCase(),
    );
    if (existing) {
      return errorResponse(409, `Ya existe un contenedor con el código ${parsed.data.code}.`, path);
    }

    const newContainer: Container = {
      id: `cont-${Date.now()}`,
      ...parsed.data,
      status: "ACTIVE",
    };
    addContainerFixture(newContainer);

    return NextResponse.json(newContainer, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo registrar el contenedor.");
  }
}
