import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { complianceIndicatorFixture, coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "@/lib/indicator-fixtures";
import { defaultIndicatorQuery, indicatorQuerySchema } from "@/lib/indicators";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const families = ["coverage", "compliance", "incidents", "waste"] as const;
type IndicatorFamily = (typeof families)[number];
const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status });
}

function queryString(request: Request, family: IndicatorFamily) {
  const url = new URL(request.url);
  const raw = { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined, zoneId: url.searchParams.get("zoneId") ?? undefined, serviceTypeId: url.searchParams.get("serviceTypeId") ?? undefined };
  const parsed = indicatorQuerySchema.safeParse(raw);
  if (!parsed.success) return { error: "Los filtros de indicadores no respetan el formato esperado." } as const;
  const params = new URLSearchParams();
  if (parsed.data.from) params.set("from", parsed.data.from);
  if (parsed.data.to) params.set("to", parsed.data.to);
  if ((family === "coverage" || family === "compliance") && parsed.data.zoneId) params.set("zoneId", parsed.data.zoneId);
  if ((family === "coverage" || family === "compliance") && parsed.data.serviceTypeId) params.set("serviceTypeId", parsed.data.serviceTypeId);
  return { value: params.toString() ? `?${params.toString()}` : "" } as const;
}

function fixtureResponse(family: IndicatorFamily, request: Request) {
  const url = new URL(request.url);
  const defaults = defaultIndicatorQuery();
  const period = { from: url.searchParams.get("from") ?? defaults.from, to: url.searchParams.get("to") ?? defaults.to };
  if (family === "coverage") {
    const zoneId = url.searchParams.get("zoneId");
    const serviceTypeId = url.searchParams.get("serviceTypeId");
    return { ...coverageIndicatorFixture, period, byZone: zoneId ? coverageIndicatorFixture.byZone.filter((item) => item.id === zoneId) : coverageIndicatorFixture.byZone, byServiceType: serviceTypeId ? coverageIndicatorFixture.byServiceType.filter((item) => item.id === serviceTypeId) : coverageIndicatorFixture.byServiceType };
  }
  if (family === "compliance") {
    const zoneId = url.searchParams.get("zoneId");
    return { ...complianceIndicatorFixture, period, unattendedZones: zoneId ? complianceIndicatorFixture.unattendedZones.filter((item) => item.id === zoneId) : complianceIndicatorFixture.unattendedZones };
  }
  if (family === "incidents") return { ...incidentsIndicatorFixture, period };
  return { ...wasteIndicatorFixture, period };
}

export async function GET(request: Request, context: { params: Promise<{ family: string }> }) {
  const { family } = await context.params;
  const path = new URL(request.url).pathname;
  if (!families.includes(family as IndicatorFamily)) return errorResponse(404, "Familia de indicadores no encontrada.", path);
  const typedFamily = family as IndicatorFamily;

  try {
    const session = getRequiredSession(request);
    requireCapability(session, "indicator:view");
    const query = queryString(request, typedFamily);
    if ("error" in query && query.error) return errorResponse(400, query.error, path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(request, `/indicators/${typedFamily}${query.value}`, "indicator:view");
      return new NextResponse(await backendResponse.text(), { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
    }
    return NextResponse.json(fixtureResponse(typedFamily, request));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene la capacidad indicator:view.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar los indicadores.", path);
  }
}
