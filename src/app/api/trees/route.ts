import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addTreeFixture, filterTreeFixtures, paginateTreeFixtures, treeFixtures } from "@/lib/tree-fixtures";
import { treeCreateInputSchema, type TreeQuery } from "@/lib/trees";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";



function parseQuery(url: URL): TreeQuery {
  return {
    active: url.searchParams.has("active") ? url.searchParams.get("active") === "true" : undefined,
    zoneId: url.searchParams.get("zoneId") ?? undefined,
    search: searchParam(url.searchParams),
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}
function backendQueryString(query: TreeQuery) {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}
function requireOfficeCapability(request: Request) {
  const session = getRequiredSession(request);
  const scenario = getScenario(session);
  if (scenario.actor.kind !== "OFFICE") throw new ForbiddenSessionError("Solo Oficina puede administrar árboles.");
  requireCapability(session, "tree:manage");
  return session;
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = parseQuery(new URL(request.url));
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/trees${backendQueryString(query)}`);
      return forwardResponse(response);
    }
    return NextResponse.json(paginateTreeFixtures(filterTreeFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar los árboles.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = requireOfficeCapability(request);
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo de la solicitud no es un JSON válido.", path); }
    const parsed = treeCreateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, "/trees", "tree:manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(response);
    }
    if (treeFixtures.some((item) => item.surveyCode.toLowerCase() === parsed.data.surveyCode.toLowerCase())) return errorResponse(409, `Ya existe un árbol con el código de relevamiento '${parsed.data.surveyCode}'.`, path);
    const created = { id: `tree-${Date.now()}`, ...parsed.data, address: parsed.data.address ?? null, lat: parsed.data.lat ?? null, lng: parsed.data.lng ?? null, active: parsed.data.active ?? true, lastSurvey: null };
    addTreeFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo crear el árbol.");
  }
}
