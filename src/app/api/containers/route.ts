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

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
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
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function backendQueryString(query: ContainerQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.containerType) params.set("containerType", query.containerType);
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const query = parseContainerQuery(new URL(request.url));

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/containers${backendQueryString(query)}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
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
    return errorResponse(500, "No se pudieron cargar los contenedores.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);

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

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/containers", "container:manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
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
    return errorResponse(500, "No se pudo registrar el contenedor.", path);
  }
}
