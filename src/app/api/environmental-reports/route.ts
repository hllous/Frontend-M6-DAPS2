import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addEnvironmentalReportFixture,
  createEnvironmentalReportFixture,
  filterEnvironmentalReportFixtures,
  getSanctionOutcomeIntegrationExceptions,
  paginateEnvironmentalReportFixtures,
} from "@/lib/environmental-report-fixtures";
import {
  createEnvironmentalReportInputSchema,
  environmentalReportSchema,
  environmentalReportDateRangeSchema,
  environmentalReportPrioritySchema,
  environmentalReportStatusSchema,
  environmentalReportTypeSchema,
  type EnvironmentalReport,
  type EnvironmentalReportQuery,
  type EnvironmentalReportStatus,
} from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
import { droppedRecords, tolerantRecords } from "@/lib/tolerant-records";





function parseStatuses(searchParams: URLSearchParams): { statuses?: EnvironmentalReportStatus[]; error?: string } {
  const parsed = z.array(environmentalReportStatusSchema).safeParse(searchParams.getAll("status"));
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
  const statuses = [...new Set(parsed.data)];
  return { statuses: statuses.length > 0 ? statuses : undefined };
}

function queryFromUrl(url: URL, status?: EnvironmentalReportQuery["status"]): EnvironmentalReportQuery {
  return {
    status,
    reportType: environmentalReportTypeSchema.safeParse(url.searchParams.get("reportType")).data,
    priority: environmentalReportPrioritySchema.safeParse(url.searchParams.get("priority")).data,
    publicId: url.searchParams.get("publicId") ?? undefined,
    ticketId: url.searchParams.get("ticketId") ?? undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    search: searchParam(url.searchParams),
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function visibleToField(report: { assignedCrewId?: string | null }, scenario: ReturnType<typeof getScenario>) {
  return scenario.actor.kind !== "FIELD" || Boolean(scenario.actor.crewId && report.assignedCrewId === scenario.actor.crewId);
}

function matchesQuery(report: EnvironmentalReport, query: EnvironmentalReportQuery) {
  const statuses = Array.isArray(query.status) ? query.status : query.status ? [query.status] : [];
  if (statuses.length > 0 && !statuses.includes(report.status)) return false;
  if (query.reportType && report.reportType !== query.reportType) return false;
  if (query.priority && report.priority !== query.priority) return false;
  if (query.publicId && report.publicId !== query.publicId) return false;
  if (query.ticketId && report.ticketId !== query.ticketId) return false;
  const search = query.search?.trim().toLowerCase();
  if (search && ![report.id, report.address ?? "", report.description ?? "", report.publicId ?? "", report.ticketId ?? ""].some((value) => value.toLowerCase().includes(search))) return false;
  return true;
}

const environmentalReportPageSchema = z.object({
  data: tolerantRecords(environmentalReportSchema, "environmental-reports"),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
}).passthrough();

function backendListQuery(query: EnvironmentalReportQuery, page: number, pageSize: number) {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const statuses = Array.isArray(query.status) ? query.status : query.status ? [query.status] : [];
  for (const status of statuses) params.append("status", status);
  if (query.reportType) params.set("reportType", query.reportType);
  if (query.priority) params.set("priority", query.priority);
  if (query.publicId) params.set("publicId", query.publicId);
  if (query.ticketId) params.set("ticketId", query.ticketId);
  const search = query.search?.trim();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

async function listFieldReports(request: Request, query: EnvironmentalReportQuery, crewId: string | undefined, path: string) {
  if (!crewId) return errorResponse(403, "La sesión no tiene una cuadrilla asignada.", path);

  const backendPageSize = 100;
  const visibleReports: EnvironmentalReport[] = [];
  let totalPages = 1;
  // ponytail: counts every unreadable record of the scan, not just this crew's (its crew is unreadable); the notice may slightly overstate.
  let dropped = 0;
  for (let page = 1; page <= totalPages; page += 1) {
    const backendResponse = await fetchBackend(
      request,
      `/environmental-reports?${backendListQuery(query, page, backendPageSize)}`,
      "environmentalReport:view",
    );
    if (!backendResponse.ok) return forwardResponse(backendResponse);

    let payload: unknown;
    try { payload = await backendResponse.json(); } catch {
      return errorResponse(502, "La respuesta de expedientes ambientales no contiene JSON válido.", path);
    }
    const parsed = environmentalReportPageSchema.safeParse(payload);
    if (!parsed.success) return errorResponse(502, "La respuesta de expedientes ambientales no respeta el contrato documentado.", path);
    if (page === 1) totalPages = Math.max(1, parsed.data.meta.totalPages);
    dropped += droppedRecords(parsed.data.data);
    visibleReports.push(...parsed.data.data.filter((report) => report.assignedCrewId === crewId && matchesQuery(report, query)));
  }

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 100;
  return NextResponse.json({
    data: visibleReports.slice((page - 1) * pageSize, page * pageSize),
    meta: { total: visibleReports.length, page, pageSize, totalPages: Math.max(1, Math.ceil(visibleReports.length / pageSize)), ...(dropped ? { dropped } : {}) },
    sanctionOutcomeIntegrationExceptions: [],
  });
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "environmentalReport:view", throwOnError: true });
    const scenario = getScenario(session);
    const url = new URL(request.url);
    const parsedStatuses = parseStatuses(url.searchParams);
    if (parsedStatuses.error) return errorResponse(400, parsedStatuses.error, path);
    const query = queryFromUrl(url, parsedStatuses.statuses);
    const range = environmentalReportDateRangeSchema.safeParse(query);
    if (!range.success) return errorResponse(400, range.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
      if (scenario.actor.kind === "FIELD") return listFieldReports(request, query, session.crew?.id, path);
      const backendQuery = new URLSearchParams(url.searchParams);
      backendQuery.delete("status");
      for (const status of parsedStatuses.statuses ?? []) backendQuery.append("status", status);
      const backendResponse = await fetchBackend(request, `/environmental-reports?${backendQuery.toString()}`, "environmentalReport:view");
      return forwardResponse(backendResponse);
    }

    const filtered = filterEnvironmentalReportFixtures(query).filter((report) => visibleToField(report, scenario));
    const page = paginateEnvironmentalReportFixtures(filtered, query.page, query.pageSize);
    return NextResponse.json(scenario.actor.kind === "OFFICE" ? { ...page, sanctionOutcomeIntegrationExceptions: getSanctionOutcomeIntegrationExceptions() } : page);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene acceso al control ambiental.", path, FORBIDDEN_CODES.roleRequired);
    return mapSessionError(error, path, "No se pudieron cargar los expedientes ambientales.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "environmentalReport:create", throwOnError: true });
    const scenario = getScenario(session);
    if (scenario.actor.kind !== "FIELD" && scenario.actor.kind !== "OFFICE") return errorResponse(403, "Solo Oficina o Campo puede abrir expedientes.", path);
    const body = await request.json().catch(() => undefined);
    const parsed = createEnvironmentalReportInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);

    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, "/environmental-reports", "environmentalReport:create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(backendResponse);
    }

    const created = createEnvironmentalReportFixture(parsed.data, scenario.actor.kind === "FIELD" ? scenario.actor.crewId : undefined);
    addEnvironmentalReportFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene permiso para abrir expedientes.", path, FORBIDDEN_CODES.roleRequired);
    return mapSessionError(error, path, "No se pudo abrir el expediente ambiental.");
  }
}
