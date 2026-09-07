import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addEnvironmentalReportFixture,
  createEnvironmentalReportFixture,
  filterEnvironmentalReportFixtures,
  paginateEnvironmentalReportFixtures,
} from "@/lib/environmental-report-fixtures";
import {
  createEnvironmentalReportInputSchema,
  environmentalReportPrioritySchema,
  environmentalReportStatusSchema,
  environmentalReportTypeSchema,
  type EnvironmentalReportQuery,
} from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function queryFromUrl(url: URL): EnvironmentalReportQuery {
  return {
    status: environmentalReportStatusSchema.safeParse(url.searchParams.get("status")).data,
    reportType: environmentalReportTypeSchema.safeParse(url.searchParams.get("reportType")).data,
    priority: environmentalReportPrioritySchema.safeParse(url.searchParams.get("priority")).data,
    ticketId: url.searchParams.get("ticketId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

function visibleToField(report: { assignedCrewId?: string | null }, scenario: ReturnType<typeof getScenario>) {
  return scenario.actor.kind !== "FIELD" || Boolean(scenario.actor.crewId && report.assignedCrewId === scenario.actor.crewId);
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalReport:view");
    const scenario = getScenario(session.scenarioId);
    const query = queryFromUrl(new URL(request.url));

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/environmental-reports${new URL(request.url).search}`, "environmentalReport:view");
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }

    const filtered = filterEnvironmentalReportFixtures(query).filter((report) => visibleToField(report, scenario));
    return NextResponse.json(paginateEnvironmentalReportFixtures(filtered, query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene acceso al control ambiental.", path);
    return errorResponse(500, "No se pudieron cargar los expedientes ambientales.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "environmentalReport:create");
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "FIELD" && scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina o Campo puede abrir expedientes.", path);
    const body = await request.json().catch(() => undefined);
    const parsed = createEnvironmentalReportInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, "/environmental-reports", "environmentalReport:create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }

    const created = createEnvironmentalReportFixture(parsed.data, scenario.actor.kind === "FIELD" ? scenario.actor.crewId : undefined);
    addEnvironmentalReportFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof Error && error.name === "ForbiddenSessionError") return errorResponse(403, "La sesión no tiene permiso para abrir expedientes.", path);
    return errorResponse(500, "No se pudo abrir el expediente ambiental.", path);
  }
}
