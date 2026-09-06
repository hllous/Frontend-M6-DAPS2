import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { serviceFixtures } from "@/lib/services-fixtures";
import {
  addRepairRequestFixture,
  createRepairRequestFixture,
  filterRepairRequestFixtures,
  paginateRepairRequestFixtures,
} from "@/lib/repair-request-fixtures";
import {
  createRepairRequestInputSchema,
  repairDamageTypeSchema,
  repairRequestStatusSchema,
  repairSeveritySchema,
  type RepairRequestQuery,
} from "@/lib/repair-requests";
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
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function sessionAndScenario(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session.scenarioId);
  return { session, scenario };
}

function fieldCanAccessService(scenario: ReturnType<typeof getScenario>, serviceId: string) {
  return (
    scenario.actor.kind === "FIELD" &&
    Boolean(scenario.actor.crewId) &&
    serviceFixtures.some(
      (service) => service.id === serviceId && service.crewId === scenario.actor.crewId,
    )
  );
}

function queryFromUrl(url: URL): RepairRequestQuery {
  return {
    status: repairRequestStatusSchema.safeParse(url.searchParams.get("status")).data,
    damageType: repairDamageTypeSchema.safeParse(url.searchParams.get("damageType")).data,
    severity: repairSeveritySchema.safeParse(url.searchParams.get("severity")).data,
    detectedInId: url.searchParams.get("detectedInId") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = sessionAndScenario(request);
    const query = queryFromUrl(new URL(request.url));

    if (scenario.actor.kind === "FIELD") {
      if (!query.detectedInId || !fieldCanAccessService(scenario, query.detectedInId)) {
        return errorResponse(403, "Solo puede consultar derivaciones de Servicios de su cuadrilla.", path);
      }
    } else if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/repair-requests${new URL(request.url).search}`);
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    return NextResponse.json(paginateRepairRequestFixtures(filterRepairRequestFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las derivaciones.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const { session, scenario } = sessionAndScenario(request);
    if (scenario.actor.kind !== "OFFICE" && scenario.actor.kind !== "FIELD") {
      return errorResponse(403, "Solo Oficina o Campo puede crear derivaciones.", path);
    }

    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = createRepairRequestInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (parsed.data.detectedInType !== "SERVICE") return errorResponse(400, "En esta fase la derivación debe originarse en un Servicio.", path);
    if (scenario.actor.kind === "FIELD" && !fieldCanAccessService(scenario, parsed.data.detectedInId)) {
      return errorResponse(403, "Solo puede crear derivaciones desde Servicios de su cuadrilla.", path);
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/repair-requests", undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      return new NextResponse(await backendResponse.text(), {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    const service = serviceFixtures.find((candidate) => candidate.id === parsed.data.detectedInId);
    if (!service) return errorResponse(404, `Servicio ${parsed.data.detectedInId} no encontrado.`, path);
    const created = createRepairRequestFixture(parsed.data, service);
    addRepairRequestFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo crear la derivación.", path);
  }
}
