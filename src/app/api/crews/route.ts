import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addCrewFixture, filterCrewFixtures, paginateCrewFixtures } from "@/lib/crew-fixtures";
import { createCrewInputSchema, type CrewQuery, crewTypeSchema, shiftSchema } from "@/lib/crews";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function parseQuery(url: URL): CrewQuery {
  const active = url.searchParams.get("active");
  const crewType = crewTypeSchema.safeParse(url.searchParams.get("crewType"));
  const defaultShift = shiftSchema.safeParse(url.searchParams.get("defaultShift"));
  return {
    active: active === null ? undefined : active === "true",
    crewType: crewType.success ? crewType.data : undefined,
    defaultShift: defaultShift.success ? defaultShift.data : undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function queryString(query: CrewQuery) {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.crewType) params.set("crewType", query.crewType);
  if (query.defaultShift) params.set("defaultShift", query.defaultShift);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function requireOfficeCapability(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar cuadrillas.");
  requireCapability(session, "crew:manage");
  return session;
}

function forwardResponse(response: Response) {
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseQuery(new URL(request.url));
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, `/crews${queryString(query)}`));
    const scenario = getScenario(session.scenarioId);
    const scopedQuery = scenario.actor.kind === "FIELD" ? { ...query, crewId: scenario.actor.crewId } : query;
    return NextResponse.json(paginateCrewFixtures(filterCrewFixtures(scopedQuery), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las cuadrillas.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = createCrewInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) return forwardResponse(await fetchBackend(request, "/crews", "crew:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
    const crew = { id: `crew-${Date.now()}`, ...parsed.data, memberUserIds: [parsed.data.leaderUserId], active: true };
    addCrewFixture(crew);
    return NextResponse.json(crew, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo registrar la cuadrilla.", path);
  }
}
