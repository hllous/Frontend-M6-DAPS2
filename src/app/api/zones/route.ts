import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { filterZoneFixtures, paginateZoneFixtures } from "@/lib/zones-fixtures";
import type { ZoneQuery } from "@/lib/zones";

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
      return NextResponse.json({ message: "La sesión no está activa." }, { status: 401 });
    }
    if (error instanceof AuthUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudieron cargar las zonas." }, { status: 500 });
  }
}
