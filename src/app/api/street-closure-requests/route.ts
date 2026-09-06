import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addStreetClosureRequestFixture,
  createStreetClosureRequestFixture,
  filterStreetClosureRequestFixtures,
  paginateStreetClosureRequestFixtures,
} from "@/lib/street-closure-request-fixtures";
import {
  createStreetClosureRequestInputSchema,
  streetClosureRequestQuerySchema,
} from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { serviceFixtures } from "@/lib/services-fixtures";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
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

function requireOffice(request: Request, path: string) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  if (scenario.actor.kind !== "OFFICE") {
    return { response: errorResponse(403, "Solo Oficina puede consultar solicitudes de corte de calle.", path) };
  }
  return { session, scenario };
}

function backendQueryString(query: ReturnType<typeof streetClosureRequestQuerySchema.parse>): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.sourceId) params.set("sourceId", query.sourceId);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const access = requireOffice(request, path);
    if (access.response) return access.response;
    const queryResult = streetClosureRequestQuerySchema.safeParse({
      status: new URL(request.url).searchParams.get("status") ?? undefined,
      sourceId: new URL(request.url).searchParams.get("sourceId") ?? undefined,
      page: new URL(request.url).searchParams.has("page")
        ? Number(new URL(request.url).searchParams.get("page"))
        : undefined,
      pageSize: new URL(request.url).searchParams.has("pageSize")
        ? Number(new URL(request.url).searchParams.get("pageSize"))
        : undefined,
    });
    if (!queryResult.success) {
      return errorResponse(400, "Los filtros de solicitudes de corte de calle son inválidos.", path);
    }

    if (access.session && access.session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        `/street-closure-requests${backendQueryString(queryResult.data)}`,
      );
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    return NextResponse.json(
      paginateStreetClosureRequestFixtures(filterStreetClosureRequestFixtures(queryResult.data), queryResult.data.page, queryResult.data.pageSize),
    );
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las solicitudes de corte de calle.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina puede crear solicitudes de corte de calle.", path);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path);
    }
    const parsed = createStreetClosureRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    }

    if (session && session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/street-closure-requests", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const service = serviceFixtures.find((candidate) => candidate.id === parsed.data.sourceId);
    if (!service) return errorResponse(404, `Servicio ${parsed.data.sourceId} no encontrado.`, path);
    const created = createStreetClosureRequestFixture(parsed.data, service);
    addStreetClosureRequestFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo crear la solicitud de corte de calle.", path);
  }
}
