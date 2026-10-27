import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addCrewFixture, filterCrewFixtures, paginateCrewFixtures } from "@/lib/crew-fixtures";
import { createCrewInputSchema, type CrewQuery, crewSchema, crewTypeSchema, shiftSchema } from "@/lib/crews";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { pageParam, pageSizeParam } from "@/lib/input-limits";





function parseQuery(url: URL): CrewQuery {
  const active = url.searchParams.get("active");
  const crewType = crewTypeSchema.safeParse(url.searchParams.get("crewType"));
  const defaultShift = shiftSchema.safeParse(url.searchParams.get("defaultShift"));
  return {
    active: active === null ? undefined : active === "true",
    crewType: crewType.success ? crewType.data : undefined,
    defaultShift: defaultShift.success ? defaultShift.data : undefined,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function normalizeCrewPayload(payload: unknown): unknown {
  const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload)
    ? (payload as { data: unknown }).data
    : payload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const crew = raw as Record<string, unknown>;
  if (Array.isArray(crew.members) && !Array.isArray(crew.memberUserIds)) {
    return {
      ...crew,
      memberUserIds: crew.members.flatMap((member) =>
        member && typeof member === "object" && "userId" in member && typeof member.userId === "string"
          ? [member.userId]
          : [],
      ),
    };
  }
  return raw;
}

function requireOfficeCapability(request: Request) { return authorize(request, { office: true, officeMessage: "Solo Oficina puede administrar cuadrillas.", capability: "crew:manage", throwOnError: true }).session; }

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseQuery(new URL(request.url));
    const scenario = getScenario(session);
    if (backendMode(session)) {
      if (scenario.actor.kind !== "FIELD") return forwardResponse(await fetchBackend(request, `/crews${backendQuery(query, ["active", "crewType", "defaultShift", "page", "pageSize"])}`));

      const crewId = session.crew?.id;
      if (!crewId) return errorResponse(403, "La sesión no tiene una cuadrilla asignada.", path);
      const backendResponse = await fetchBackend(request, `/crews/${pathId(crewId)}`);
      if (!backendResponse.ok) return forwardResponse(backendResponse);

      let payload: unknown;
      try { payload = await backendResponse.json(); } catch {
        return errorResponse(502, "La respuesta de cuadrilla no contiene JSON válido.", path);
      }
      const parsedCrew = crewSchema.safeParse(normalizeCrewPayload(payload));
      if (!parsedCrew.success) return errorResponse(502, "La respuesta de cuadrilla no respeta el contrato documentado.", path);

      const crew = parsedCrew.data;
      const matches = (query.active === undefined || crew.active === query.active)
        && (!query.crewType || crew.crewType === query.crewType)
        && (!query.defaultShift || crew.defaultShift === query.defaultShift);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const total = matches ? 1 : 0;
      return NextResponse.json({
        data: matches && page === 1 ? [crew] : [],
        meta: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    }
    const scopedQuery = scenario.actor.kind === "FIELD" ? { ...query, crewId: scenario.actor.crewId } : query;
    return NextResponse.json(paginateCrewFixtures(filterCrewFixtures(scopedQuery), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) { recordTelemetryEvent({ name: "auth_session_expired", status: 401 }); return errorResponse(401, "La sesión no está activa.", path); }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las cuadrillas.");
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
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, "/crews", "crew:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
    const crew = { id: `crew-${Date.now()}`, ...parsed.data, memberUserIds: [parsed.data.leaderUserId], active: true };
    addCrewFixture(crew);
    return NextResponse.json(crew, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return mapSessionError(error, path, error.message);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo registrar la cuadrilla.");
  }
}
