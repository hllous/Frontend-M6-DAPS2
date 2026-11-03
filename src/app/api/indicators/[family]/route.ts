import { NextResponse } from "next/server";

import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { indicatorFixtureResponse } from "@/lib/indicator-fixtures";
import { familyAppliesCatalogFilters, indicatorBucketSchema, indicatorQueryErrorMessage, indicatorQuerySchema } from "@/lib/indicators";
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
  const bucketValue = url.searchParams.get("bucket");
  const bucket = bucketValue === null ? undefined : indicatorBucketSchema.safeParse(bucketValue);
  const compare = url.searchParams.get("compare");
  if (bucket && !bucket.success) return { error: "Intervalo de indicadores inválido." } as const;
  if (compare && compare !== "previous") return { error: "Comparación de indicadores inválida." } as const;
  const query = backendQuery(parsed.data, allowedKeys);
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  if (bucket?.success) params.set("bucket", bucket.data);
  if (compare) params.set("compare", compare);
  return { value: `?${params.toString()}` } as const;
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
    const fixture = indicatorFixtureResponse(typedFamily, request);
    if (fixture.error) return errorResponse(400, fixture.error, path);
    return NextResponse.json(fixture);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, "La sesión no tiene la capacidad indicator:view.", path, FORBIDDEN_CODES.roleRequired);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los indicadores.");
  }
}
