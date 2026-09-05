import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { filterServiceFixtures, paginateServiceFixtures } from "@/lib/services-fixtures";
import type { ServiceMode, ServiceOrigin, ServiceQuery, ServiceStatus } from "@/lib/services";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
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

function parseServiceQuery(url: URL): ServiceQuery {
  const statuses = url.searchParams.getAll("status");
  return {
    status: statuses.length > 1
      ? (statuses as ServiceStatus[])
      : statuses.length === 1
      ? (statuses[0] as ServiceStatus)
      : undefined,
    mode: (url.searchParams.get("mode") as ServiceMode) ?? undefined,
    origin: (url.searchParams.get("origin") as ServiceOrigin) ?? undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    crewId: url.searchParams.get("crewId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    timeFrom: url.searchParams.get("timeFrom") ?? undefined,
    timeTo: url.searchParams.get("timeTo") ?? undefined,
    scheduledFrom: url.searchParams.get("scheduledFrom") ?? undefined,
    scheduledTo: url.searchParams.get("scheduledTo") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function backendQueryString(query: ServiceQuery): string {
  const params = new URLSearchParams();
  if (query.status) {
    if (Array.isArray(query.status)) {
      query.status.forEach((st) => params.append("status", st));
    } else {
      params.set("status", query.status);
    }
  }
  if (query.mode) params.set("mode", query.mode);
  if (query.origin) params.set("origin", query.origin);
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.crewId) params.set("crewId", query.crewId);
  if (query.search) params.set("search", query.search);
  if (query.timeFrom) params.set("timeFrom", query.timeFrom);
  if (query.timeTo) params.set("timeTo", query.timeTo);
  if (query.scheduledFrom) params.set("scheduledFrom", query.scheduledFrom);
  if (query.scheduledTo) params.set("scheduledTo", query.scheduledTo);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const query = parseServiceQuery(new URL(request.url));

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/services${backendQueryString(query)}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    return NextResponse.json(paginateServiceFixtures(filterServiceFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) {
      return errorResponse(503, error.message, path);
    }
    return errorResponse(500, "No se pudieron cargar los servicios.", path);
  }
}
