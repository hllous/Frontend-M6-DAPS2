import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { filterZoneFixtures, paginateZoneFixtures } from "@/lib/zones-fixtures";
import type { ZoneQuery } from "@/lib/zones";

const ERROR_LABELS: Record<number, string> = {
  401: "Unauthorized",
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

function parseZoneQuery(url: URL): ZoneQuery {
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function backendQueryString(query: ZoneQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
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
    const query = parseZoneQuery(new URL(request.url));

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/zones${backendQueryString(query)}`);
      const body = await backendResponse.text();
      return new NextResponse(body, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
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
    return errorResponse(500, "No se pudieron cargar las zonas.", path);
  }
}
