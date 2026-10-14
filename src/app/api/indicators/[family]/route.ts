import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
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
  return { value: backendQuery(parsed.data, allowedKeys) } as const;
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
    return { ...complianceIndicatorFixture, period, notServicedRanking: zoneId ? complianceIndicatorFixture.notServicedRanking.filter((item) => item.zoneId === zoneId) : complianceIndicatorFixture.notServicedRanking };
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
    authorize(session, { capability: "indicator:view", throwOnError: true });
    const query = queryString(request, typedFamily);
    if ("error" in query && query.error) return errorResponse(400, query.error, path);
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/indicators/${typedFamily}${query.value}`, "indicator:view");
      return forwardResponse(backendResponse);
    }
    return NextResponse.json(fixtureResponse(typedFamily, request));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene la capacidad indicator:view.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los indicadores.");
  }
}
