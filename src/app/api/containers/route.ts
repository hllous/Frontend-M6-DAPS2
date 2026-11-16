import { backendMode, backendQuery, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
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
import { getRequiredSession } from "@/lib/session";
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
    return handleRouteError(error, path, "No se pudieron cargar los contenedores.");
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

    const parsed = await parseJsonBody(request, createContainerInputSchema, path);
    if (parsed instanceof Response) return parsed;

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
    return handleRouteError(error, path, "No se pudo registrar el contenedor.");
  }
}
