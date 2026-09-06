import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addServiceFrequencyFixture, filterServiceFrequencyFixtures, paginateServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { serviceFrequencyCreateInputSchema, serviceFrequencyShiftSchema, type ServiceFrequencyQuery } from "@/lib/service-frequencies";
import { serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 409: "Conflict", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function parseQuery(url: URL): ServiceFrequencyQuery {
  const shift = serviceFrequencyShiftSchema.safeParse(url.searchParams.get("shift"));
  const weekday = Number(url.searchParams.get("weekday"));
  return {
    serviceTypeId: url.searchParams.get("serviceTypeId") ?? undefined,
    routeId: url.searchParams.get("routeId") ?? undefined,
    shift: shift.success ? shift.data : undefined,
    weekday: Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : undefined,
    validOn: url.searchParams.get("validOn") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function queryString(query: ServiceFrequencyQuery) {
  const params = new URLSearchParams();
  if (query.serviceTypeId) params.set("serviceTypeId", query.serviceTypeId);
  if (query.routeId) params.set("routeId", query.routeId);
  if (query.shift) params.set("shift", query.shift);
  if (query.weekday !== undefined) params.set("weekday", String(query.weekday));
  if (query.validOn) params.set("validOn", query.validOn);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function requireOfficeCapability(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar frecuencias de servicio.");
  requireCapability(session, "serviceFrequency:manage");
  return session;
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseQuery(new URL(request.url));
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/service-frequencies${queryString(query)}`);
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    return NextResponse.json(paginateServiceFrequencyFixtures(filterServiceFrequencyFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las frecuencias de servicio.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = serviceFrequencyCreateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, "/service-frequencies", "serviceFrequency:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const serviceType = serviceTypeFixtures.find((item) => item.id === parsed.data.serviceTypeId);
    if (!serviceType || serviceType.mode !== "ROUTE") return errorResponse(400, "El tipo de servicio debe ser de modo ROUTE.", path);
    const created = { id: `freq-${Date.now()}`, ...parsed.data, validTo: parsed.data.validTo ?? null };
    addServiceFrequencyFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo crear la frecuencia de servicio.", path);
  }
}
