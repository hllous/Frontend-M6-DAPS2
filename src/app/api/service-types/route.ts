import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addServiceTypeFixture, filterServiceTypeFixtures, paginateServiceTypeFixtures } from "@/lib/service-type-fixtures";
import { serviceTypeCategorySchema, serviceTypeCreateInputSchema, serviceTypeModeSchema, type ServiceTypeQuery } from "@/lib/service-types";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";





function parseQuery(url: URL): ServiceTypeQuery {
  const activeParam = url.searchParams.get("active");
  const category = serviceTypeCategorySchema.safeParse(url.searchParams.get("category"));
  const mode = serviceTypeModeSchema.safeParse(url.searchParams.get("mode"));
  return {
    active: activeParam === null ? undefined : activeParam === "true",
    category: category.success ? category.data : undefined,
    mode: mode.success ? mode.data : undefined,
    search: searchParam(url.searchParams),
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function backendQueryString(query: ServiceTypeQuery) {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.category) params.set("category", query.category);
  if (query.mode) params.set("mode", query.mode);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function requireOfficeCapability(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session);
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar tipos de servicio.");
  requireCapability(session, "serviceType:manage");
  return session;
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseQuery(new URL(request.url));
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/service-types${backendQueryString(query)}`);
      return forwardResponse(response);
    }
    return NextResponse.json(paginateServiceTypeFixtures(filterServiceTypeFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los tipos de servicio.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = serviceTypeCreateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, "/service-types", "serviceType:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(response);
    }
    const created = { id: `st-${Date.now()}`, ...parsed.data, active: true };
    addServiceTypeFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo crear el tipo de servicio.");
  }
}
