import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { complianceIndicatorFixture, coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "@/lib/indicator-fixtures";
import { defaultIndicatorQuery, familyAppliesCatalogFilters, indicatorQueryErrorMessage, indicatorQuerySchema } from "@/lib/indicators";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";

const families = ["coverage", "compliance", "incidents", "waste"] as const;
type IndicatorFamily = (typeof families)[number];




function queryString(request: Request, family: IndicatorFamily) {
  const url = new URL(request.url);
  const raw = { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined, zoneId: url.searchParams.get("zoneId") ?? undefined, serviceTypeId: url.searchParams.get("serviceTypeId") ?? undefined };
  const parsed = indicatorQuerySchema.safeParse(raw);
  if (!parsed.success) return { error: indicatorQueryErrorMessage(parsed.error) } as const;
  const allowedKeys = familyAppliesCatalogFilters(family)
    ? ["from", "to", "zoneId", "serviceTypeId"]
    : ["from", "to"];
  const bucket = url.searchParams.get("bucket");
  const compare = url.searchParams.get("compare");
  if (bucket && !["day", "week", "month"].includes(bucket)) return { error: "Intervalo de indicadores inválido." } as const;
  if (compare && compare !== "previous") return { error: "Comparación de indicadores inválida." } as const;
  const query = backendQuery(parsed.data, allowedKeys);
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  if (bucket) params.set("bucket", bucket);
  if (compare) params.set("compare", compare);
  return { value: `?${params.toString()}` } as const;
}

function fixturePeriods(from: string, to: string, bucket: string) {
  const result: Array<{ from: string; to: string }> = [];
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const date = (value: Date) => value.toISOString().slice(0, 10);
  while (start <= end && result.length <= 90) {
    const next = new Date(start);
    if (bucket === "month") { next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth() + 1); }
    else next.setUTCDate(next.getUTCDate() + (bucket === "week" ? 7 - ((next.getUTCDay() + 6) % 7) : 1));
    const last = new Date(Math.min(end.getTime(), next.getTime() - 86400000));
    result.push({ from: date(start), to: date(last) });
    start = next;
  }
  return result;
}

function fixtureResponse(family: IndicatorFamily, request: Request) {
  const url = new URL(request.url);
  const defaults = defaultIndicatorQuery();
  const period = { from: url.searchParams.get("from") ?? defaults.from, to: url.searchParams.get("to") ?? defaults.to };
  const bucket = url.searchParams.get("bucket");
  const periods = bucket ? fixturePeriods(period.from, period.to, bucket) : [];
  if (periods.length > 90) return { error: "El rango supera el máximo de 90 intervalos." };
  const share = (value: number, index: number) => Math.floor(value / periods.length) + (index < value % periods.length ? 1 : 0);
  const previousTo = new Date(`${period.from}T00:00:00Z`);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86400000));
  const previousPeriod = { from: previousFrom.toISOString().slice(0, 10), to: previousTo.toISOString().slice(0, 10) };
  if (family === "coverage") {
    const zoneId = url.searchParams.get("zoneId");
    const serviceTypeId = url.searchParams.get("serviceTypeId");
    return { ...coverageIndicatorFixture, period, previous: { ...coverageIndicatorFixture.previous!, period: previousPeriod }, series: bucket ? periods.map((point, index) => {
      const totals = coverageIndicatorFixture.totals;
      const scheduled = share(totals.scheduled, index);
      const served = share(totals.served, index);
      return { ...point, scheduled, served, partial: share(totals.partial, index), notServiced: share(totals.notServiced, index), pending: share(totals.pending, index), upcoming: share(totals.upcoming ?? 0, index), coveragePct: scheduled ? Math.round(1000 * served / scheduled) / 10 : 0 };
    }) : undefined, byZone: zoneId ? coverageIndicatorFixture.byZone.filter((item) => item.id === zoneId) : coverageIndicatorFixture.byZone, byServiceType: serviceTypeId ? coverageIndicatorFixture.byServiceType.filter((item) => item.id === serviceTypeId) : coverageIndicatorFixture.byServiceType };
  }
  if (family === "compliance") {
    const zoneId = url.searchParams.get("zoneId");
    return { ...complianceIndicatorFixture, period, previous: { ...complianceIndicatorFixture.previous!, period: previousPeriod }, series: bucket ? periods.map((point, index) => {
      const finished = complianceIndicatorFixture.finished;
      const deviation = complianceIndicatorFixture.schedulingDeviation!;
      const total = share(finished.total, index), onTime = share(finished.onTime, index);
      const all = share(deviation.total, index), deviated = share(deviation.deviated, index);
      return { ...point, finished: { total, onTime, late: total - onTime, onTimePct: total ? Math.round(onTime * 1000 / total) / 10 : 0 }, schedulingDeviation: { total: all, deviated, deviatedPct: all ? Math.round(deviated * 1000 / all) / 10 : 0 } };
    }) : undefined, notServicedRanking: zoneId ? complianceIndicatorFixture.notServicedRanking.filter((item) => item.zoneId === zoneId) : complianceIndicatorFixture.notServicedRanking };
  }
  if (family === "incidents") return { ...incidentsIndicatorFixture, period, previous: { ...incidentsIndicatorFixture.previous!, period: previousPeriod }, series: bucket ? periods.map((point, index) => {
    const sample = incidentsIndicatorFixture.series![0];
    const resolved = share(sample.withinDeadline!.resolved, index), withinDeadline = share(sample.withinDeadline!.withinDeadline, index);
    return { ...sample, ...point, total: share(sample.total, index), withinDeadline: { resolved, withinDeadline, pct: resolved ? Math.round(withinDeadline * 1000 / resolved) / 10 : null }, containers: { overflowIncidents: share(sample.containers!.overflowIncidents, index), damageIncidents: share(sample.containers!.damageIncidents, index), pendingDamage: null } };
  }) : undefined };
  return { ...wasteIndicatorFixture, period, previous: { ...wasteIndicatorFixture.previous!, period: previousPeriod }, series: bucket ? periods.map((point, index) => {
    const totals = wasteIndicatorFixture.totals;
    const weightKg = share(totals.weightKg, index), divertedKg = share(totals.divertedKg, index);
    return { ...point, weightKg, divertedKg, volumeM3: Math.round(totals.volumeM3 * 10 / periods.length) / 10, divertedPct: weightKg ? Math.round(divertedKg * 1000 / weightKg) / 10 : 0 };
  }) : undefined };
}

export async function GET(request: Request, context: { params: Promise<{ family: string }> }) {
  const { family } = await context.params;
  const path = new URL(request.url).pathname;
  if (!families.includes(family as IndicatorFamily)) return errorResponse(404, "Familia de indicadores no encontrada.", path);
  const typedFamily = family as IndicatorFamily;

  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "indicator:view", throwOnError: true });
    const query = queryString(request, typedFamily);
    if ("error" in query && query.error) return errorResponse(400, query.error, path);
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/indicators/${typedFamily}${query.value}`, "indicator:view");
      return forwardResponse(backendResponse);
    }
    const fixture = fixtureResponse(typedFamily, request);
    if ("error" in fixture && fixture.error) return errorResponse(400, fixture.error, path);
    return NextResponse.json(fixture);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene la capacidad indicator:view.", path, FORBIDDEN_CODES.roleRequired);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los indicadores.");
  }
}
